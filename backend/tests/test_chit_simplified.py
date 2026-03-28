"""
Test suite for Simplified Chit Fund System
Tests the new simplified chit fund tracking with:
- Monthly entry with dividend_received (Is Mahine Mila) instead of auction_amount
- Effective Cost = EMI Paid - Dividend Received
- paid-months API for month dropdown
- Cash book transaction with new description format
"""
import pytest
import requests
import os
from datetime import datetime

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
        "name": "TEST_Simplified_Chit",
        "chit_value": 1000000,  # 10 Lakh
        "monthly_installment": 50000,  # 50K EMI
        "total_members": 20,
        "duration_months": 20,
        "start_date": datetime.now().strftime("%Y-%m-%d"),
        "organizer": "Test Chit Company",
        "note": "Test chit for simplified dividend system"
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


# ==================== PAID MONTHS API TESTS ====================

class TestPaidMonthsAPI:
    """Test paid-months API for month dropdown"""
    
    def test_get_paid_months_empty(self, api_client, test_chit):
        """Test paid-months returns empty list for new chit"""
        response = api_client.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/paid-months")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["duration_months"] == 20
        assert data["paid_months"] == []
        assert len(data["pending_months"]) == 20
        assert data["pending_months"] == list(range(1, 21))
        
        print("SUCCESS: paid-months returns empty list for new chit")
    
    def test_get_paid_months_after_entries(self, api_client, test_chit):
        """Test paid-months shows paid months after adding entries"""
        # Add entries for months 1, 3, 5
        for month in [1, 3, 5]:
            entry_data = {
                "chit_id": test_chit["id"],
                "month_number": month,
                "payment_date": datetime.now().strftime("%Y-%m-%d"),
                "paid_amount": 50000,
                "dividend_received": 15000,
                "payment_mode": "cash"
            }
            api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        
        # Get paid months
        response = api_client.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/paid-months")
        assert response.status_code == 200
        
        data = response.json()
        assert data["paid_months"] == [1, 3, 5]
        assert 1 not in data["pending_months"]
        assert 3 not in data["pending_months"]
        assert 5 not in data["pending_months"]
        assert 2 in data["pending_months"]
        assert 4 in data["pending_months"]
        
        print("SUCCESS: paid-months correctly shows paid and pending months")


# ==================== MONTHLY ENTRY WITH DIVIDEND_RECEIVED TESTS ====================

class TestMonthlyEntryDividendReceived:
    """Test monthly entry with dividend_received field (simplified system)"""
    
    def test_add_entry_with_dividend_received(self, api_client, test_chit):
        """Test adding monthly entry with dividend_received field"""
        # EMI = 50000, Mila = 20000, Effective Cost = 30000
        entry_data = {
            "chit_id": test_chit["id"],
            "month_number": 1,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "paid_amount": 50000,
            "dividend_received": 20000,
            "payment_mode": "cash",
            "note": "First month entry"
        }
        response = api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["month"] == 1
        assert data["paid"] == 50000
        assert data["dividend_received"] == 20000
        assert data["effective_cost"] == 30000, "Effective cost = EMI - Dividend = 50000 - 20000"
        assert "transaction_id" in data
        
        print(f"SUCCESS: Entry added - EMI: ₹50,000, Mila: ₹20,000, Effective: ₹30,000")
    
    def test_effective_cost_calculation(self, api_client, test_chit):
        """Test effective cost formula: EMI Paid - Dividend Received"""
        test_cases = [
            {"paid": 50000, "dividend": 20000, "expected_effective": 30000},
            {"paid": 50000, "dividend": 15000, "expected_effective": 35000},
            {"paid": 50000, "dividend": 25000, "expected_effective": 25000},
            {"paid": 50000, "dividend": 0, "expected_effective": 50000},
        ]
        
        for i, tc in enumerate(test_cases, start=1):
            entry_data = {
                "chit_id": test_chit["id"],
                "month_number": i,
                "payment_date": datetime.now().strftime("%Y-%m-%d"),
                "paid_amount": tc["paid"],
                "dividend_received": tc["dividend"],
                "payment_mode": "cash"
            }
            response = api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
            assert response.status_code == 200, f"Failed for month {i}: {response.text}"
            
            data = response.json()
            assert data["effective_cost"] == tc["expected_effective"], \
                f"Month {i}: Expected effective_cost {tc['expected_effective']}, got {data['effective_cost']}"
            print(f"SUCCESS: Month {i} - Paid ₹{tc['paid']:,}, Mila ₹{tc['dividend']:,} → Effective ₹{data['effective_cost']:,}")
    
    def test_duplicate_month_entry_blocked(self, api_client, test_chit):
        """Test that duplicate entry for same month is blocked"""
        entry_data = {
            "chit_id": test_chit["id"],
            "month_number": 1,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "paid_amount": 50000,
            "dividend_received": 20000,
            "payment_mode": "cash"
        }
        # First entry
        response1 = api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        assert response1.status_code == 200
        
        # Duplicate entry
        response2 = api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        assert response2.status_code == 400
        assert "already" in response2.json()["detail"].lower()
        print("SUCCESS: Duplicate month entry blocked")
    
    def test_entry_updates_chit_totals(self, api_client, test_chit):
        """Test that monthly entry updates chit's total_paid and total_dividend"""
        # Add 3 entries
        entries = [
            {"month": 1, "paid": 50000, "dividend": 20000},
            {"month": 2, "paid": 50000, "dividend": 15000},
            {"month": 3, "paid": 50000, "dividend": 25000},
        ]
        
        for e in entries:
            entry_data = {
                "chit_id": test_chit["id"],
                "month_number": e["month"],
                "payment_date": datetime.now().strftime("%Y-%m-%d"),
                "paid_amount": e["paid"],
                "dividend_received": e["dividend"],
                "payment_mode": "cash"
            }
            api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        
        # Verify chit totals
        chit_response = api_client.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}")
        assert chit_response.status_code == 200
        
        chit = chit_response.json()
        expected_total_paid = 50000 * 3  # 1,50,000
        expected_total_dividend = 20000 + 15000 + 25000  # 60,000
        
        assert chit["total_paid"] == expected_total_paid, f"Expected total_paid {expected_total_paid}, got {chit['total_paid']}"
        assert chit["total_dividend"] == expected_total_dividend, f"Expected total_dividend {expected_total_dividend}, got {chit['total_dividend']}"
        assert chit["payments_count"] == 3
        
        print(f"SUCCESS: Chit totals updated - Paid: ₹{chit['total_paid']:,}, Dividend: ₹{chit['total_dividend']:,}")


# ==================== CASH BOOK TRANSACTION TESTS ====================

class TestCashBookTransaction:
    """Test Cash Book transaction with new description format"""
    
    def test_transaction_description_format(self, api_client, test_chit):
        """Test that transaction description shows EMI and Mila amounts"""
        entry_data = {
            "chit_id": test_chit["id"],
            "month_number": 1,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "paid_amount": 50000,
            "dividend_received": 20000,
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
        # Check new description format
        assert "Month 1" in txn["description"]
        assert "EMI" in txn["description"]
        assert "Mila" in txn["description"]
        assert "50,000" in txn["description"] or "50000" in txn["description"]
        assert "20,000" in txn["description"] or "20000" in txn["description"]
        
        print(f"SUCCESS: Transaction description: {txn['description']}")


# ==================== MONTHLY ENTRIES LIST TESTS ====================

class TestMonthlyEntriesList:
    """Test getting monthly entries with new fields"""
    
    def test_entries_have_dividend_received_and_effective_cost(self, api_client, test_chit):
        """Test that entries list shows dividend_received and effective_cost"""
        # Add entry
        entry_data = {
            "chit_id": test_chit["id"],
            "month_number": 1,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "paid_amount": 50000,
            "dividend_received": 20000,
            "payment_mode": "cash"
        }
        api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        
        # Get entries
        response = api_client.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entries")
        assert response.status_code == 200
        
        entries = response.json()
        assert len(entries) == 1
        entry = entries[0]
        
        assert entry["month_number"] == 1
        assert entry["paid_amount"] == 50000
        assert entry["dividend_received"] == 20000
        assert entry["effective_cost"] == 30000
        
        print("SUCCESS: Entries list shows dividend_received and effective_cost")


# ==================== SUMMARY TESTS ====================

class TestChitSummary:
    """Test chit fund summary with net profit calculation"""
    
    def test_summary_net_profit_calculation(self, api_client, test_chit):
        """Test net profit calculation in summary"""
        # Add 3 entries
        for month in [1, 2, 3]:
            entry_data = {
                "chit_id": test_chit["id"],
                "month_number": month,
                "payment_date": datetime.now().strftime("%Y-%m-%d"),
                "paid_amount": 50000,
                "dividend_received": 20000,
                "payment_mode": "cash"
            }
            api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        
        # Get summary
        response = api_client.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/summary")
        assert response.status_code == 200
        
        data = response.json()
        summary = data["summary"]
        
        assert summary["total_paid"] == 150000  # 3 x 50000
        assert summary["total_dividend"] == 60000  # 3 x 20000
        assert summary["is_lifted"] == False
        # Net profit when not lifted = Total Dividend
        assert summary["net_profit"] == 60000
        assert summary["is_profit"] == True
        assert summary["months_completed"] == 3
        
        print(f"SUCCESS: Summary - Total Paid: ₹{summary['total_paid']:,}, Total Dividend: ₹{summary['total_dividend']:,}, Net Profit: ₹{summary['net_profit']:,}")


# ==================== DELETE ENTRY TESTS ====================

class TestDeleteEntry:
    """Test deleting monthly entry"""
    
    def test_delete_entry_updates_totals(self, api_client, test_chit):
        """Test deleting entry updates chit totals"""
        # Add 2 entries
        for month in [1, 2]:
            entry_data = {
                "chit_id": test_chit["id"],
                "month_number": month,
                "payment_date": datetime.now().strftime("%Y-%m-%d"),
                "paid_amount": 50000,
                "dividend_received": 20000,
                "payment_mode": "cash"
            }
            api_client.post(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entry", json=entry_data)
        
        # Get entries
        entries = api_client.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/monthly-entries").json()
        assert len(entries) == 2
        
        # Verify initial totals
        chit = api_client.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}").json()
        assert chit["total_paid"] == 100000
        assert chit["total_dividend"] == 40000
        assert chit["payments_count"] == 2
        
        # Delete one entry
        delete_response = api_client.delete(f"{BASE_URL}/api/chit-monthly-entries/{entries[0]['id']}")
        assert delete_response.status_code == 200
        
        # Verify updated totals
        chit = api_client.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}").json()
        assert chit["total_paid"] == 50000
        assert chit["total_dividend"] == 20000
        assert chit["payments_count"] == 1
        
        print("SUCCESS: Delete entry updates chit totals correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
