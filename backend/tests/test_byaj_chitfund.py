"""
Test suite for Byaj (Interest) with Monthly Rate and Chit Fund features
Tests the new monthly interest calculation (30-day basis) and Chit Fund CRUD with Cash Book integration
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

@pytest.fixture(scope="module")
def test_party(api_client):
    """Create a test party for interest account tests"""
    party_data = {
        "name": "TEST_Byaj_Party",
        "phone": "9999888877",
        "address": "Test Address",
        "opening_balance": 0,
        "balance_type": "debit"
    }
    response = api_client.post(f"{BASE_URL}/api/parties", json=party_data)
    assert response.status_code == 200, f"Failed to create party: {response.text}"
    party = response.json()
    yield party
    # Cleanup
    try:
        api_client.delete(f"{BASE_URL}/api/parties/{party['id']}")
    except:
        pass

@pytest.fixture(scope="module")
def test_interest_account(api_client, test_party):
    """Create a test interest account"""
    # Start date 45 days ago for testing
    start_date = (datetime.now() - timedelta(days=45)).strftime("%Y-%m-%d")
    account_data = {
        "party_id": test_party["id"],
        "principal_amount": 100000,  # 1 Lakh
        "interest_rate": 2,  # 2% per month
        "start_date": start_date,
        "note": "Test interest account for monthly calculation"
    }
    response = api_client.post(f"{BASE_URL}/api/interest-accounts", json=account_data)
    assert response.status_code == 200, f"Failed to create interest account: {response.text}"
    account = response.json()
    yield account
    # Cleanup
    try:
        api_client.delete(f"{BASE_URL}/api/interest-accounts/{account['id']}")
    except:
        pass


# ==================== BYAJ (INTEREST) TESTS ====================

class TestByajMonthlyCalculation:
    """Test Byaj calculation with monthly rate (30-day basis)"""
    
    def test_interest_account_creation(self, api_client, test_party):
        """Test creating interest account with monthly rate"""
        start_date = datetime.now().strftime("%Y-%m-%d")
        account_data = {
            "party_id": test_party["id"],
            "principal_amount": 1000000,  # 10 Lakh
            "interest_rate": 12,  # 12% per month
            "start_date": start_date,
            "note": "High rate test account"
        }
        response = api_client.post(f"{BASE_URL}/api/interest-accounts", json=account_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["principal_amount"] == 1000000
        assert data["interest_rate"] == 12
        assert data["is_active"] == True
        assert "id" in data
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/interest-accounts/{data['id']}")
        print("SUCCESS: Interest account created with monthly rate")
    
    def test_interest_calculation_30_days_equals_1_month(self, api_client, test_party):
        """Test that 30 days = 1 month exactly (not 28, 29, or 31)"""
        # Create account starting 30 days ago
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        account_data = {
            "party_id": test_party["id"],
            "principal_amount": 100000,  # 1 Lakh
            "interest_rate": 2,  # 2% per month
            "start_date": start_date,
            "note": "30-day test"
        }
        response = api_client.post(f"{BASE_URL}/api/interest-accounts", json=account_data)
        assert response.status_code == 200
        account = response.json()
        
        # Calculate interest
        calc_response = api_client.get(f"{BASE_URL}/api/interest-accounts/{account['id']}/calculate?end_date={end_date}")
        assert calc_response.status_code == 200
        
        calc_data = calc_response.json()
        assert calc_data["days"] == 30, f"Expected 30 days, got {calc_data['days']}"
        assert calc_data["months"] == 1.0, f"Expected 1.0 months, got {calc_data['months']}"
        
        # Formula: (Principal × Monthly Rate × Months) / 100
        # (100000 × 2 × 1) / 100 = 2000
        expected_interest = 2000
        assert calc_data["calculated_interest"] == expected_interest, f"Expected {expected_interest}, got {calc_data['calculated_interest']}"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/interest-accounts/{account['id']}")
        print(f"SUCCESS: 30 days = 1 month, Interest = ₹{calc_data['calculated_interest']}")
    
    def test_interest_calculation_45_days_equals_1_5_months(self, api_client, test_party):
        """Test that 45 days = 1.5 months"""
        start_date = (datetime.now() - timedelta(days=45)).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        account_data = {
            "party_id": test_party["id"],
            "principal_amount": 100000,  # 1 Lakh
            "interest_rate": 2,  # 2% per month
            "start_date": start_date,
            "note": "45-day test"
        }
        response = api_client.post(f"{BASE_URL}/api/interest-accounts", json=account_data)
        assert response.status_code == 200
        account = response.json()
        
        # Calculate interest
        calc_response = api_client.get(f"{BASE_URL}/api/interest-accounts/{account['id']}/calculate?end_date={end_date}")
        assert calc_response.status_code == 200
        
        calc_data = calc_response.json()
        assert calc_data["days"] == 45, f"Expected 45 days, got {calc_data['days']}"
        assert calc_data["months"] == 1.5, f"Expected 1.5 months, got {calc_data['months']}"
        
        # Formula: (Principal × Monthly Rate × Months) / 100
        # (100000 × 2 × 1.5) / 100 = 3000
        expected_interest = 3000
        assert calc_data["calculated_interest"] == expected_interest, f"Expected {expected_interest}, got {calc_data['calculated_interest']}"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/interest-accounts/{account['id']}")
        print(f"SUCCESS: 45 days = 1.5 months, Interest = ₹{calc_data['calculated_interest']}")
    
    def test_interest_calculation_60_days_equals_2_months(self, api_client, test_party):
        """Test that 60 days = 2 months"""
        start_date = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        account_data = {
            "party_id": test_party["id"],
            "principal_amount": 500000,  # 5 Lakh
            "interest_rate": 3,  # 3% per month
            "start_date": start_date,
            "note": "60-day test"
        }
        response = api_client.post(f"{BASE_URL}/api/interest-accounts", json=account_data)
        assert response.status_code == 200
        account = response.json()
        
        # Calculate interest
        calc_response = api_client.get(f"{BASE_URL}/api/interest-accounts/{account['id']}/calculate?end_date={end_date}")
        assert calc_response.status_code == 200
        
        calc_data = calc_response.json()
        assert calc_data["days"] == 60, f"Expected 60 days, got {calc_data['days']}"
        assert calc_data["months"] == 2.0, f"Expected 2.0 months, got {calc_data['months']}"
        
        # Formula: (Principal × Monthly Rate × Months) / 100
        # (500000 × 3 × 2) / 100 = 30000
        expected_interest = 30000
        assert calc_data["calculated_interest"] == expected_interest, f"Expected {expected_interest}, got {calc_data['calculated_interest']}"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/interest-accounts/{account['id']}")
        print(f"SUCCESS: 60 days = 2 months, Interest = ₹{calc_data['calculated_interest']}")
    
    def test_interest_calculation_large_principal(self, api_client, test_party):
        """Test with large principal (1 Crore at 12% monthly for 30 days)"""
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        account_data = {
            "party_id": test_party["id"],
            "principal_amount": 10000000,  # 1 Crore
            "interest_rate": 12,  # 12% per month (like existing Vivek account)
            "start_date": start_date,
            "note": "Large principal test"
        }
        response = api_client.post(f"{BASE_URL}/api/interest-accounts", json=account_data)
        assert response.status_code == 200
        account = response.json()
        
        # Calculate interest
        calc_response = api_client.get(f"{BASE_URL}/api/interest-accounts/{account['id']}/calculate?end_date={end_date}")
        assert calc_response.status_code == 200
        
        calc_data = calc_response.json()
        # Formula: (10000000 × 12 × 1) / 100 = 1200000 (12 Lakh)
        expected_interest = 1200000
        assert calc_data["calculated_interest"] == expected_interest, f"Expected {expected_interest}, got {calc_data['calculated_interest']}"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/interest-accounts/{account['id']}")
        print(f"SUCCESS: 1 Crore at 12%/month for 1 month = ₹{calc_data['calculated_interest']:,}")
    
    def test_add_interest_to_cashbook(self, api_client, test_party):
        """Test adding calculated interest to cash book"""
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        account_data = {
            "party_id": test_party["id"],
            "principal_amount": 100000,
            "interest_rate": 2,
            "start_date": start_date,
            "note": "Cashbook test"
        }
        response = api_client.post(f"{BASE_URL}/api/interest-accounts", json=account_data)
        assert response.status_code == 200
        account = response.json()
        
        # Add to cashbook
        add_response = api_client.post(f"{BASE_URL}/api/interest-accounts/{account['id']}/add-to-cashbook?end_date={end_date}")
        assert add_response.status_code == 200
        
        add_data = add_response.json()
        assert add_data["interest_amount"] == 2000
        assert "transaction_id" in add_data
        assert add_data["party_name"] == "TEST_Byaj_Party"
        
        # Verify transaction in cashbook
        txn_response = api_client.get(f"{BASE_URL}/api/transactions/{add_data['transaction_id']}")
        assert txn_response.status_code == 200
        txn = txn_response.json()
        assert txn["transaction_type"] == "debit"
        assert txn["amount"] == 2000
        assert txn["category"] == "interest_paid"
        assert "%/month" in txn["description"]
        assert "months" in txn["description"]
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/transactions/{add_data['transaction_id']}")
        api_client.delete(f"{BASE_URL}/api/interest-accounts/{account['id']}")
        print(f"SUCCESS: Interest ₹2000 added to Cash Book with correct description")


# ==================== CHIT FUND TESTS ====================

class TestChitFundCRUD:
    """Test Chit Fund CRUD operations"""
    
    def test_create_chit_fund(self, api_client):
        """Test creating a new chit fund"""
        chit_data = {
            "name": "TEST_Navkar_Chit_5L",
            "total_amount": 500000,
            "monthly_installment": 25000,
            "total_members": 20,
            "duration_months": 20,
            "start_date": datetime.now().strftime("%Y-%m-%d"),
            "organizer": "Navkar Chit Fund",
            "note": "Test chit fund"
        }
        response = api_client.post(f"{BASE_URL}/api/chit-funds", json=chit_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "TEST_Navkar_Chit_5L"
        assert data["total_amount"] == 500000
        assert data["monthly_installment"] == 25000
        assert data["total_members"] == 20
        assert data["duration_months"] == 20
        assert data["is_active"] == True
        assert data["is_won"] == False
        assert data["total_paid"] == 0
        assert data["payments_count"] == 0
        assert "id" in data
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/chit-funds/{data['id']}")
        print("SUCCESS: Chit fund created with all fields")
    
    def test_get_all_chit_funds(self, api_client):
        """Test getting all chit funds"""
        # Create a chit first
        chit_data = {
            "name": "TEST_List_Chit",
            "total_amount": 100000,
            "monthly_installment": 5000,
            "total_members": 20,
            "duration_months": 20,
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        create_response = api_client.post(f"{BASE_URL}/api/chit-funds", json=chit_data)
        chit = create_response.json()
        
        # Get all
        response = api_client.get(f"{BASE_URL}/api/chit-funds")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        chit_names = [c["name"] for c in data]
        assert "TEST_List_Chit" in chit_names
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/chit-funds/{chit['id']}")
        print(f"SUCCESS: Retrieved {len(data)} chit funds")
    
    def test_get_chit_fund_by_id(self, api_client):
        """Test getting a specific chit fund"""
        chit_data = {
            "name": "TEST_Single_Chit",
            "total_amount": 200000,
            "monthly_installment": 10000,
            "total_members": 20,
            "duration_months": 20,
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        create_response = api_client.post(f"{BASE_URL}/api/chit-funds", json=chit_data)
        chit = create_response.json()
        
        # Get by ID
        response = api_client.get(f"{BASE_URL}/api/chit-funds/{chit['id']}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == chit["id"]
        assert data["name"] == "TEST_Single_Chit"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/chit-funds/{chit['id']}")
        print("SUCCESS: Retrieved chit fund by ID")
    
    def test_update_chit_fund(self, api_client):
        """Test updating chit fund details"""
        chit_data = {
            "name": "TEST_Update_Chit",
            "total_amount": 300000,
            "monthly_installment": 15000,
            "total_members": 20,
            "duration_months": 20,
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        create_response = api_client.post(f"{BASE_URL}/api/chit-funds", json=chit_data)
        chit = create_response.json()
        
        # Update
        update_data = {
            "name": "TEST_Updated_Chit_Name",
            "organizer": "New Organizer",
            "note": "Updated note"
        }
        response = api_client.put(f"{BASE_URL}/api/chit-funds/{chit['id']}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "TEST_Updated_Chit_Name"
        assert data["organizer"] == "New Organizer"
        assert data["note"] == "Updated note"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/chit-funds/{chit['id']}")
        print("SUCCESS: Chit fund updated")


class TestChitFundPayments:
    """Test Chit Fund payment operations with Cash Book integration"""
    
    def test_pay_installment_adds_to_cashbook(self, api_client):
        """Test paying installment auto-adds DEBIT to Cash Book"""
        # Create chit
        chit_data = {
            "name": "TEST_Payment_Chit",
            "total_amount": 500000,
            "monthly_installment": 25000,
            "total_members": 20,
            "duration_months": 20,
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        create_response = api_client.post(f"{BASE_URL}/api/chit-funds", json=chit_data)
        chit = create_response.json()
        
        # Pay installment
        payment_data = {
            "chit_id": chit["id"],
            "month_number": 1,
            "amount": 25000,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "payment_mode": "cash",
            "note": "First installment"
        }
        pay_response = api_client.post(f"{BASE_URL}/api/chit-funds/{chit['id']}/pay", json=payment_data)
        assert pay_response.status_code == 200
        
        payment = pay_response.json()
        assert payment["amount"] == 25000
        assert payment["month_number"] == 1
        assert "transaction_id" in payment
        
        # Verify transaction in Cash Book
        txn_response = api_client.get(f"{BASE_URL}/api/transactions/{payment['transaction_id']}")
        assert txn_response.status_code == 200
        txn = txn_response.json()
        assert txn["transaction_type"] == "debit", "Payment should be DEBIT (money going out)"
        assert txn["amount"] == 25000
        assert txn["category"] == "chit_fund"
        assert "TEST_Payment_Chit" in txn["description"]
        assert "Month 1" in txn["description"]
        
        # Verify chit totals updated
        chit_response = api_client.get(f"{BASE_URL}/api/chit-funds/{chit['id']}")
        updated_chit = chit_response.json()
        assert updated_chit["total_paid"] == 25000
        assert updated_chit["payments_count"] == 1
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/chit-payments/{payment['id']}")
        api_client.delete(f"{BASE_URL}/api/chit-funds/{chit['id']}")
        print("SUCCESS: Installment paid and DEBIT added to Cash Book")
    
    def test_duplicate_month_payment_blocked(self, api_client):
        """Test that duplicate payment for same month is blocked"""
        # Create chit
        chit_data = {
            "name": "TEST_Duplicate_Chit",
            "total_amount": 100000,
            "monthly_installment": 5000,
            "total_members": 20,
            "duration_months": 20,
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        create_response = api_client.post(f"{BASE_URL}/api/chit-funds", json=chit_data)
        chit = create_response.json()
        
        # First payment
        payment_data = {
            "chit_id": chit["id"],
            "month_number": 1,
            "amount": 5000,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "payment_mode": "upi"
        }
        pay_response = api_client.post(f"{BASE_URL}/api/chit-funds/{chit['id']}/pay", json=payment_data)
        assert pay_response.status_code == 200
        payment = pay_response.json()
        
        # Try duplicate payment
        dup_response = api_client.post(f"{BASE_URL}/api/chit-funds/{chit['id']}/pay", json=payment_data)
        assert dup_response.status_code == 400
        assert "already exists" in dup_response.json()["detail"]
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/chit-payments/{payment['id']}")
        api_client.delete(f"{BASE_URL}/api/chit-funds/{chit['id']}")
        print("SUCCESS: Duplicate month payment blocked")
    
    def test_view_payment_history(self, api_client):
        """Test viewing payment history for a chit"""
        # Create chit
        chit_data = {
            "name": "TEST_History_Chit",
            "total_amount": 100000,
            "monthly_installment": 5000,
            "total_members": 20,
            "duration_months": 20,
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        create_response = api_client.post(f"{BASE_URL}/api/chit-funds", json=chit_data)
        chit = create_response.json()
        
        # Make 3 payments
        payments = []
        for month in [1, 2, 3]:
            payment_data = {
                "chit_id": chit["id"],
                "month_number": month,
                "amount": 5000,
                "payment_date": datetime.now().strftime("%Y-%m-%d"),
                "payment_mode": "cash"
            }
            pay_response = api_client.post(f"{BASE_URL}/api/chit-funds/{chit['id']}/pay", json=payment_data)
            payments.append(pay_response.json())
        
        # Get payment history
        history_response = api_client.get(f"{BASE_URL}/api/chit-funds/{chit['id']}/payments")
        assert history_response.status_code == 200
        
        history = history_response.json()
        assert len(history) == 3
        assert history[0]["month_number"] == 1
        assert history[1]["month_number"] == 2
        assert history[2]["month_number"] == 3
        
        # Cleanup
        for p in payments:
            api_client.delete(f"{BASE_URL}/api/chit-payments/{p['id']}")
        api_client.delete(f"{BASE_URL}/api/chit-funds/{chit['id']}")
        print("SUCCESS: Payment history retrieved (3 payments)")


class TestChitFundWin:
    """Test Chit Fund win functionality with Cash Book integration"""
    
    def test_mark_chit_won_adds_credit_to_cashbook(self, api_client):
        """Test marking chit as won auto-adds CREDIT to Cash Book"""
        # Create chit
        chit_data = {
            "name": "TEST_Win_Chit",
            "total_amount": 500000,
            "monthly_installment": 25000,
            "total_members": 20,
            "duration_months": 20,
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        create_response = api_client.post(f"{BASE_URL}/api/chit-funds", json=chit_data)
        chit = create_response.json()
        
        # Mark as won
        win_response = api_client.post(
            f"{BASE_URL}/api/chit-funds/{chit['id']}/win?won_month=5&won_amount=450000&payment_mode=bank_transfer"
        )
        assert win_response.status_code == 200
        
        win_data = win_response.json()
        assert win_data["won_month"] == 5
        assert win_data["won_amount"] == 450000
        assert "transaction_id" in win_data
        
        # Verify transaction in Cash Book
        txn_response = api_client.get(f"{BASE_URL}/api/transactions/{win_data['transaction_id']}")
        assert txn_response.status_code == 200
        txn = txn_response.json()
        assert txn["transaction_type"] == "credit", "Win should be CREDIT (money coming in)"
        assert txn["amount"] == 450000
        assert "Chit Fund Won" in txn["description"]
        assert "TEST_Win_Chit" in txn["description"]
        
        # Verify chit updated
        chit_response = api_client.get(f"{BASE_URL}/api/chit-funds/{chit['id']}")
        updated_chit = chit_response.json()
        assert updated_chit["is_won"] == True
        assert updated_chit["won_month"] == 5
        assert updated_chit["won_amount"] == 450000
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/transactions/{win_data['transaction_id']}")
        api_client.delete(f"{BASE_URL}/api/chit-funds/{chit['id']}")
        print("SUCCESS: Chit won and CREDIT ₹4,50,000 added to Cash Book")
    
    def test_duplicate_win_blocked(self, api_client):
        """Test that marking already won chit as won again is blocked"""
        # Create chit
        chit_data = {
            "name": "TEST_DupWin_Chit",
            "total_amount": 100000,
            "monthly_installment": 5000,
            "total_members": 20,
            "duration_months": 20,
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        create_response = api_client.post(f"{BASE_URL}/api/chit-funds", json=chit_data)
        chit = create_response.json()
        
        # First win
        win_response = api_client.post(
            f"{BASE_URL}/api/chit-funds/{chit['id']}/win?won_month=3&won_amount=95000&payment_mode=cash"
        )
        assert win_response.status_code == 200
        win_data = win_response.json()
        
        # Try duplicate win
        dup_response = api_client.post(
            f"{BASE_URL}/api/chit-funds/{chit['id']}/win?won_month=5&won_amount=90000&payment_mode=upi"
        )
        assert dup_response.status_code == 400
        assert "already marked as won" in dup_response.json()["detail"]
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/transactions/{win_data['transaction_id']}")
        api_client.delete(f"{BASE_URL}/api/chit-funds/{chit['id']}")
        print("SUCCESS: Duplicate win blocked")


class TestChitFundSummary:
    """Test Chit Fund summary calculations"""
    
    def test_chit_summary_totals(self, api_client):
        """Test summary shows correct totals"""
        # Create chit with payments
        chit_data = {
            "name": "TEST_Summary_Chit",
            "total_amount": 100000,
            "monthly_installment": 5000,
            "total_members": 20,
            "duration_months": 20,
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        create_response = api_client.post(f"{BASE_URL}/api/chit-funds", json=chit_data)
        chit = create_response.json()
        
        # Make 5 payments (25000 total)
        payments = []
        for month in range(1, 6):
            payment_data = {
                "chit_id": chit["id"],
                "month_number": month,
                "amount": 5000,
                "payment_date": datetime.now().strftime("%Y-%m-%d"),
                "payment_mode": "cash"
            }
            pay_response = api_client.post(f"{BASE_URL}/api/chit-funds/{chit['id']}/pay", json=payment_data)
            payments.append(pay_response.json())
        
        # Get summary
        summary_response = api_client.get(f"{BASE_URL}/api/chit-funds/summary/all")
        assert summary_response.status_code == 200
        
        summary = summary_response.json()
        assert summary["total_invested"] >= 25000  # At least our test chit's payments
        assert "active_chits" in summary
        assert "won_chits" in summary
        assert "total_remaining" in summary
        assert "net_position" in summary
        
        # Cleanup
        for p in payments:
            api_client.delete(f"{BASE_URL}/api/chit-payments/{p['id']}")
        api_client.delete(f"{BASE_URL}/api/chit-funds/{chit['id']}")
        print(f"SUCCESS: Summary shows total_invested >= ₹25,000")


class TestCashBookChitFundCategory:
    """Test Cash Book shows Chit Fund category in transactions"""
    
    def test_cashbook_shows_chit_fund_category(self, api_client):
        """Test that chit fund transactions appear with correct category"""
        # Create chit and make payment
        chit_data = {
            "name": "TEST_Category_Chit",
            "total_amount": 100000,
            "monthly_installment": 5000,
            "total_members": 20,
            "duration_months": 20,
            "start_date": datetime.now().strftime("%Y-%m-%d")
        }
        create_response = api_client.post(f"{BASE_URL}/api/chit-funds", json=chit_data)
        chit = create_response.json()
        
        today = datetime.now().strftime("%Y-%m-%d")
        payment_data = {
            "chit_id": chit["id"],
            "month_number": 1,
            "amount": 5000,
            "payment_date": today,
            "payment_mode": "cash"
        }
        pay_response = api_client.post(f"{BASE_URL}/api/chit-funds/{chit['id']}/pay", json=payment_data)
        payment = pay_response.json()
        
        # Get cashbook for today
        cashbook_response = api_client.get(f"{BASE_URL}/api/cashbook/{today}")
        assert cashbook_response.status_code == 200
        
        cashbook = cashbook_response.json()
        chit_txns = [t for t in cashbook["transactions"] if t.get("category") == "chit_fund"]
        assert len(chit_txns) >= 1, "Chit fund transaction should appear in cashbook"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/chit-payments/{payment['id']}")
        api_client.delete(f"{BASE_URL}/api/chit-funds/{chit['id']}")
        print("SUCCESS: Cash Book shows chit_fund category")


class TestExpensesChitFundCategory:
    """Test Expenses page shows Chit Fund category"""
    
    def test_expense_categories_include_chit_fund(self, api_client):
        """Test that chit_fund is a valid expense category"""
        today = datetime.now().strftime("%Y-%m-%d")
        expense_data = {
            "date": today,
            "category": "chit_fund",
            "amount": 10000,
            "payment_mode": "cash",
            "description": "Test chit fund expense"
        }
        response = api_client.post(f"{BASE_URL}/api/expenses", json=expense_data)
        assert response.status_code == 200
        
        expense = response.json()
        assert expense["category"] == "chit_fund"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/expenses/{expense['id']}")
        print("SUCCESS: chit_fund is valid expense category")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
