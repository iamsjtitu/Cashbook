"""
Test suite for Chit Fund Dividend System (New Implementation)
Tests the new chit fund tracking with:
- Monthly entry with auction_amount
- Auto-calculated dividend = (chit_value - auction_amount) / total_members
- Lift (uthao) tracking with credit to cash book
- Net profit calculation: Lifted Amount + Total Dividend - Total Paid
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ==================== FIXTURES ====================

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="function")
def test_chit(api_client):
    """Create a test chit fund for each test"""
    chit_data = {
        "name": "TEST_Dividend_Chit_10L",
        "chit_value": 1000000,  # 10 Lakh
        "monthly_installment": 50000,  # 50K EMI
        "total_members": 20,
        "duration_months": 20,
        "start_date": datetime.now().strftime("%Y-%m-%d"),
        "organizer": "Test Chit Company",
        "note": "Test chit for dividend calculation"
    }
    response = api_client.post(f"{BASE_URL}/api/chit-funds", json=chit_data)
    assert response.status_code == 200, f"Failed to create chit: {response.text}"
    chit = response.json()
    yield chit
    # Cleanup - delete entries first, then chit
    try:
        entries = api_client.get(f"{BASE_URL}/api/chit-funds/{chit['id']}/monthly-entries").json()
        for entry in entries:
            api_client.delete(f"{BASE_URL}/api/chit-monthly-entries/{entry['id']}")
        api_client.delete(f"{BASE_URL}/api/chit-funds/{chit['id']}")
    except:
        pass


# ==================== CHIT FUND CRUD TESTS ====================

class TestChitFundCRUD:
    """Test Chit Fund CRUD with new chit_value field"""
    
    def test_create_chit_fund_with_chit_value(self, api_client):
        """Test creating chit fund with chit_value field"""
        chit_data = {
            "name": "TEST_ChitValue_Chit",
            "chit_value": 500000,  # 5 Lakh
            "monthly_installment": 25000,
            "total_members": 20,
            "duration_months": 20,
            "start_date": datetime.now().strftime("%Y-%m-%d"),
            "organizer": "Test Company"
        }
        response = api_client.post(f"{BASE_URL}/api/chit-funds", json=chit_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["name"] == "TEST_ChitValue_Chit"
        assert data["chit_value"] == 500000, "chit_value field should be present"
        assert data["monthly_installment"] == 25000
        assert data["total_members"] == 20
        assert data["duration_months"] == 20
        assert data["is_active"] == True
        assert data["is_lifted"] == False, "New chit should not be lifted"
        assert data["total_paid"] == 0
        assert data["total_dividend"] == 0, "total_dividend should start at 0"
        assert data["payments_count"] == 0
        assert "id" in data
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/chit-funds/{data['id']}")
        print("SUCCESS: Chit fund created with chit_value field")
    
    def test_get_all_chit_funds(self, api_client, test_chit):
        """Test getting all chit funds"""
        response = api_client.get(f"{BASE_URL}/api/chit-funds")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        chit_ids = [c["id"] for c in data]
        assert test_chit["id"] in chit_ids
        print(f"SUCCESS: Retrieved {len(data)} chit funds")
    
    def test_get_chit_fund_by_id(self, api_client, test_chit):
        """Test getting a specific chit fund"""
        response = api_client.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == test_chit["id"]
        assert data["chit_value"] == 1000000
        print("SUCCESS: Retrieved chit fund by ID")
    
    def test_update_chit_fund(self, api_client, test_chit):
        """Test updating chit fund details"""
        update_data = {
            "name": "TEST_Updated_Chit_Name",
            "organizer": "Updated Organizer",
            "note": "Updated note"
        }
        response = api_client.put(f"{BASE_URL}/api/chit-funds/{test_chit['id']}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "TEST_Updated_Chit_Name"
        assert data["organizer"] == "Updated Organizer"
        print("SUCCESS: Chit fund updated")


# ==================== MONTHLY ENTRY WITH DIVIDEND TESTS ====================

class TestMonthlyEntryDividend:
    """Test monthly entry with auction_amount and auto-calculated dividend"""
    
    def test_add_monthly_entry_calculates_dividend(self, api_client, test_chit):
        """Test adding monthly entry auto-calculates dividend"""
        # Chit Value = 10L, Auction = 7.5L, Members = 20
        # Dividend = (10L - 7.5L) / 20 = 2.5L / 20 = 12,500
        entry_data = {
            "chit_id": test_chit["id"],
            "month_number": 1,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "paid_amount": 50000,  # EMI
            "auction_amount": 750000,  # 7.5 Lakh auction
            "payment_mode": "cash",
            "note": "First month entry"
        }
        response = api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["month"] == 1
        assert data["paid"] == 50000
        assert data["auction_amount"] == 750000
        assert data["dividend"] == 12500, f"Expected dividend 12500, got {data['dividend']}"
        assert data["effective_cost"] == 37500, "Effective cost = EMI - Dividend = 50000 - 12500"
        assert "transaction_id" in data
        
        print(f"SUCCESS: Monthly entry added with dividend ₹{data['dividend']}")
    
    def test_dividend_calculation_formula(self, api_client, test_chit):
        """Test dividend formula: (chit_value - auction_amount) / total_members"""
        # Test with different auction amounts
        test_cases = [
            {"auction": 800000, "expected_dividend": 10000},  # (10L - 8L) / 20 = 10000
            {"auction": 600000, "expected_dividend": 20000},  # (10L - 6L) / 20 = 20000
            {"auction": 900000, "expected_dividend": 5000},   # (10L - 9L) / 20 = 5000
        ]
        
        for i, tc in enumerate(test_cases, start=1):
            entry_data = {
                "chit_id": test_chit["id"],
                "month_number": i,
                "payment_date": datetime.now().strftime("%Y-%m-%d"),
                "paid_amount": 50000,
                "auction_amount": tc["auction"],
                "payment_mode": "cash"
            }
            response = api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
            assert response.status_code == 200, f"Failed for month {i}: {response.text}"
            
            data = response.json()
            assert data["dividend"] == tc["expected_dividend"], \
                f"Month {i}: Expected dividend {tc['expected_dividend']}, got {data['dividend']}"
            print(f"SUCCESS: Month {i} - Auction ₹{tc['auction']:,} → Dividend ₹{data['dividend']:,}")
    
    def test_duplicate_month_entry_blocked(self, api_client, test_chit):
        """Test that duplicate entry for same month is blocked"""
        entry_data = {
            "chit_id": test_chit["id"],
            "month_number": 1,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "paid_amount": 50000,
            "auction_amount": 750000,
            "payment_mode": "cash"
        }
        # First entry
        response1 = api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        assert response1.status_code == 200
        
        # Duplicate entry
        response2 = api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"]
        print("SUCCESS: Duplicate month entry blocked")
    
    def test_monthly_entry_updates_chit_totals(self, api_client, test_chit):
        """Test that monthly entry updates chit's total_paid and total_dividend"""
        # Add 3 entries
        entries = [
            {"month": 1, "auction": 750000, "dividend": 12500},
            {"month": 2, "auction": 800000, "dividend": 10000},
            {"month": 3, "auction": 700000, "dividend": 15000},
        ]
        
        for e in entries:
            entry_data = {
                "chit_id": test_chit["id"],
                "month_number": e["month"],
                "payment_date": datetime.now().strftime("%Y-%m-%d"),
                "paid_amount": 50000,
                "auction_amount": e["auction"],
                "payment_mode": "cash"
            }
            api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        
        # Verify chit totals
        chit_response = api_client.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}")
        assert chit_response.status_code == 200
        
        chit = chit_response.json()
        expected_total_paid = 50000 * 3  # 1,50,000
        expected_total_dividend = 12500 + 10000 + 15000  # 37,500
        
        assert chit["total_paid"] == expected_total_paid, f"Expected total_paid {expected_total_paid}, got {chit['total_paid']}"
        assert chit["total_dividend"] == expected_total_dividend, f"Expected total_dividend {expected_total_dividend}, got {chit['total_dividend']}"
        assert chit["payments_count"] == 3
        
        print(f"SUCCESS: Chit totals updated - Paid: ₹{chit['total_paid']:,}, Dividend: ₹{chit['total_dividend']:,}")


# ==================== GET MONTHLY ENTRIES TESTS ====================

class TestGetMonthlyEntries:
    """Test getting monthly entries for a chit"""
    
    def test_get_monthly_entries(self, api_client, test_chit):
        """Test getting all monthly entries for a chit"""
        # Add 2 entries
        for month in [1, 2]:
            entry_data = {
                "chit_id": test_chit["id"],
                "month_number": month,
                "payment_date": datetime.now().strftime("%Y-%m-%d"),
                "paid_amount": 50000,
                "auction_amount": 750000,
                "payment_mode": "cash"
            }
            api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        
        # Get entries
        response = api_client.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entries")
        assert response.status_code == 200
        
        entries = response.json()
        assert len(entries) == 2
        assert entries[0]["month_number"] == 1
        assert entries[1]["month_number"] == 2
        assert entries[0]["dividend"] == 12500
        assert entries[0]["auction_amount"] == 750000
        
        print(f"SUCCESS: Retrieved {len(entries)} monthly entries with dividend column")


# ==================== LIFT (UTHAO) TESTS ====================

class TestChitLift:
    """Test chit lift (uthao) functionality"""
    
    def test_lift_chit_adds_credit_to_cashbook(self, api_client, test_chit):
        """Test lifting chit adds credit entry to cash book"""
        # Lift the chit
        response = api_client.post(
            f"{BASE_URL}/api/chit-funds/{test_chit['id']}/lift?lifted_month=5&lifted_amount=850000&payment_mode=bank_transfer"
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["lifted_month"] == 5
        assert data["lifted_amount"] == 850000
        assert "transaction_id" in data
        
        # Verify transaction in Cash Book
        txn_response = api_client.get(f"{BASE_URL}/api/transactions/{data['transaction_id']}")
        assert txn_response.status_code == 200
        txn = txn_response.json()
        assert txn["transaction_type"] == "credit", "Lift should be CREDIT (money coming in)"
        assert txn["amount"] == 850000
        assert "Chit Lifted" in txn["description"]
        
        # Verify chit updated
        chit_response = api_client.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}")
        chit = chit_response.json()
        assert chit["is_lifted"] == True
        assert chit["lifted_month"] == 5
        assert chit["lifted_amount"] == 850000
        
        # Cleanup transaction
        api_client.delete(f"{BASE_URL}/api/transactions/{data['transaction_id']}")
        print(f"SUCCESS: Chit lifted - ₹{data['lifted_amount']:,} credited to Cash Book")
    
    def test_duplicate_lift_blocked(self, api_client, test_chit):
        """Test that lifting already lifted chit is blocked"""
        # First lift
        response1 = api_client.post(
            f"{BASE_URL}/api/chit-funds/{test_chit['id']}/lift?lifted_month=5&lifted_amount=850000&payment_mode=cash"
        )
        assert response1.status_code == 200
        txn_id = response1.json()["transaction_id"]
        
        # Try duplicate lift
        response2 = api_client.post(
            f"{BASE_URL}/api/chit-funds/{test_chit['id']}/lift?lifted_month=6&lifted_amount=800000&payment_mode=upi"
        )
        assert response2.status_code == 400
        assert "already lifted" in response2.json()["detail"]
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/transactions/{txn_id}")
        print("SUCCESS: Duplicate lift blocked")


# ==================== DELETE ENTRY TESTS ====================

class TestDeleteMonthlyEntry:
    """Test deleting monthly entry and updating totals"""
    
    def test_delete_entry_updates_totals(self, api_client, test_chit):
        """Test deleting entry updates chit totals"""
        # Add 2 entries
        entry_ids = []
        for month in [1, 2]:
            entry_data = {
                "chit_id": test_chit["id"],
                "month_number": month,
                "payment_date": datetime.now().strftime("%Y-%m-%d"),
                "paid_amount": 50000,
                "auction_amount": 750000,
                "payment_mode": "cash"
            }
            response = api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
            # Get entry ID from entries list
            entries = api_client.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entries").json()
            entry_ids = [e["id"] for e in entries]
        
        # Verify initial totals
        chit = api_client.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}").json()
        assert chit["total_paid"] == 100000  # 2 x 50000
        assert chit["total_dividend"] == 25000  # 2 x 12500
        assert chit["payments_count"] == 2
        
        # Delete one entry
        delete_response = api_client.delete(f"{BASE_URL}/api/chit-monthly-entries/{entry_ids[0]}")
        assert delete_response.status_code == 200
        
        # Verify updated totals
        chit = api_client.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}").json()
        assert chit["total_paid"] == 50000  # 1 x 50000
        assert chit["total_dividend"] == 12500  # 1 x 12500
        assert chit["payments_count"] == 1
        
        print("SUCCESS: Delete entry updates chit totals correctly")


# ==================== SUMMARY TESTS ====================

class TestChitSummary:
    """Test chit fund summary with net profit calculation"""
    
    def test_single_chit_summary_not_lifted(self, api_client, test_chit):
        """Test summary for chit that is not yet lifted"""
        # Add 3 entries
        for month in [1, 2, 3]:
            entry_data = {
                "chit_id": test_chit["id"],
                "month_number": month,
                "payment_date": datetime.now().strftime("%Y-%m-%d"),
                "paid_amount": 50000,
                "auction_amount": 750000,  # Dividend = 12500 each
                "payment_mode": "cash"
            }
            api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        
        # Get summary
        response = api_client.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/summary")
        assert response.status_code == 200
        
        data = response.json()
        summary = data["summary"]
        
        assert summary["total_paid"] == 150000  # 3 x 50000
        assert summary["total_dividend"] == 37500  # 3 x 12500
        assert summary["is_lifted"] == False
        assert summary["lifted_amount"] == 0
        # Net profit when not lifted = Total Dividend (money saved so far)
        assert summary["net_profit"] == 37500
        assert summary["is_profit"] == True
        assert summary["months_completed"] == 3
        assert summary["remaining_months"] == 17  # 20 - 3
        
        print(f"SUCCESS: Summary (not lifted) - Net Profit: ₹{summary['net_profit']:,}")
    
    def test_single_chit_summary_lifted(self, api_client, test_chit):
        """Test summary for lifted chit with final profit calculation"""
        # Add 5 entries
        for month in [1, 2, 3, 4, 5]:
            entry_data = {
                "chit_id": test_chit["id"],
                "month_number": month,
                "payment_date": datetime.now().strftime("%Y-%m-%d"),
                "paid_amount": 50000,
                "auction_amount": 750000,  # Dividend = 12500 each
                "payment_mode": "cash"
            }
            api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        
        # Lift the chit
        lift_response = api_client.post(
            f"{BASE_URL}/api/chit-funds/{test_chit['id']}/lift?lifted_month=5&lifted_amount=850000&payment_mode=bank_transfer"
        )
        txn_id = lift_response.json()["transaction_id"]
        
        # Get summary
        response = api_client.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/summary")
        assert response.status_code == 200
        
        data = response.json()
        summary = data["summary"]
        
        total_paid = 250000  # 5 x 50000
        total_dividend = 62500  # 5 x 12500
        lifted_amount = 850000
        
        assert summary["total_paid"] == total_paid
        assert summary["total_dividend"] == total_dividend
        assert summary["is_lifted"] == True
        assert summary["lifted_amount"] == lifted_amount
        
        # Net Profit = Lifted Amount + Total Dividend - Total Paid
        # = 850000 + 62500 - 250000 = 662500
        expected_net_profit = lifted_amount + total_dividend - total_paid
        assert summary["net_profit"] == expected_net_profit, \
            f"Expected net_profit {expected_net_profit}, got {summary['net_profit']}"
        assert summary["is_profit"] == True
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/transactions/{txn_id}")
        print(f"SUCCESS: Summary (lifted) - Net Profit: ₹{summary['net_profit']:,}")
    
    def test_overall_summary_all_chits(self, api_client, test_chit):
        """Test overall summary across all chits"""
        # Add some entries to test chit
        for month in [1, 2]:
            entry_data = {
                "chit_id": test_chit["id"],
                "month_number": month,
                "payment_date": datetime.now().strftime("%Y-%m-%d"),
                "paid_amount": 50000,
                "auction_amount": 750000,
                "payment_mode": "cash"
            }
            api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        
        # Get overall summary
        response = api_client.get(f"{BASE_URL}/api/chit-funds/summary/all")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_chits" in data
        assert "active_chits" in data
        assert "lifted_chits" in data
        assert "total_paid" in data
        assert "total_dividend" in data
        assert "total_lifted" in data
        assert "net_profit" in data
        assert "is_profit" in data
        assert "remaining_investment" in data
        
        # Our test chit should contribute to totals
        assert data["total_paid"] >= 100000  # At least our 2 entries
        assert data["total_dividend"] >= 25000  # At least our 2 dividends
        
        print(f"SUCCESS: Overall summary - {data['total_chits']} chits, Net: ₹{data['net_profit']:,}")


# ==================== CASH BOOK INTEGRATION TESTS ====================

class TestCashBookIntegration:
    """Test Cash Book integration with chit fund entries"""
    
    def test_monthly_entry_creates_debit_transaction(self, api_client, test_chit):
        """Test that monthly entry creates DEBIT transaction in cash book"""
        today = datetime.now().strftime("%Y-%m-%d")
        entry_data = {
            "chit_id": test_chit["id"],
            "month_number": 1,
            "payment_date": today,
            "paid_amount": 50000,
            "auction_amount": 750000,
            "payment_mode": "cash"
        }
        response = api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        assert response.status_code == 200
        
        txn_id = response.json()["transaction_id"]
        
        # Verify transaction
        txn_response = api_client.get(f"{BASE_URL}/api/transactions/{txn_id}")
        assert txn_response.status_code == 200
        txn = txn_response.json()
        
        assert txn["transaction_type"] == "debit", "EMI payment should be DEBIT"
        assert txn["amount"] == 50000
        assert txn["category"] == "chit_fund"
        assert "Month 1" in txn["description"]
        assert "Auction" in txn["description"]
        assert "Dividend" in txn["description"]
        
        print("SUCCESS: Monthly entry creates DEBIT transaction with auction/dividend info")
    
    def test_cashbook_shows_chit_transactions(self, api_client, test_chit):
        """Test that cash book shows chit fund transactions"""
        today = datetime.now().strftime("%Y-%m-%d")
        entry_data = {
            "chit_id": test_chit["id"],
            "month_number": 1,
            "payment_date": today,
            "paid_amount": 50000,
            "auction_amount": 750000,
            "payment_mode": "cash"
        }
        api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        
        # Get cashbook for today
        cashbook_response = api_client.get(f"{BASE_URL}/api/cashbook/{today}")
        assert cashbook_response.status_code == 200
        
        cashbook = cashbook_response.json()
        chit_txns = [t for t in cashbook["transactions"] if t.get("category") == "chit_fund"]
        assert len(chit_txns) >= 1, "Chit fund transaction should appear in cashbook"
        
        print("SUCCESS: Cash Book shows chit_fund category transactions")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
