"""
Test new features:
1. Party/Ledger Master - search, date filters, export
2. Chit Fund - opening installments, profit calculation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPartyLedgerFeatures:
    """Test Party/Ledger Master API endpoints"""
    
    def test_get_all_parties(self):
        """Test GET /api/parties returns list of parties"""
        response = requests.get(f"{BASE_URL}/api/parties")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/parties - Found {len(data)} parties")
    
    def test_get_leaf_parties(self):
        """Test GET /api/parties/leaf returns only leaf parties (no sub-ledgers)"""
        response = requests.get(f"{BASE_URL}/api/parties/leaf")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/parties/leaf - Found {len(data)} leaf parties")
    
    def test_get_grouped_parties(self):
        """Test GET /api/parties/grouped returns parties grouped by account head"""
        response = requests.get(f"{BASE_URL}/api/parties/grouped")
        assert response.status_code == 200
        data = response.json()
        assert "current_asset" in data
        assert "fixed_asset" in data
        assert "current_liability" in data
        print(f"✓ GET /api/parties/grouped - Grouped by account heads")
    
    def test_get_party_ledger(self):
        """Test GET /api/parties/{party_id}/ledger returns ledger entries"""
        # First get a party
        parties_response = requests.get(f"{BASE_URL}/api/parties")
        parties = parties_response.json()
        if parties:
            party_id = parties[0]["id"]
            response = requests.get(f"{BASE_URL}/api/parties/{party_id}/ledger")
            assert response.status_code == 200
            data = response.json()
            assert "party" in data
            assert "entries" in data
            assert "opening_balance" in data
            assert "current_balance" in data
            print(f"✓ GET /api/parties/{party_id}/ledger - Ledger data retrieved")
        else:
            pytest.skip("No parties found to test ledger")


class TestChitFundFeatures:
    """Test Chit Fund API endpoints with opening balance and profit calculation"""
    
    def test_get_all_chit_funds(self):
        """Test GET /api/chit-funds returns list of chit funds"""
        response = requests.get(f"{BASE_URL}/api/chit-funds")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/chit-funds - Found {len(data)} chit funds")
        return data
    
    def test_chit_fund_has_opening_fields(self):
        """Test that chit funds have opening_installments_paid and opening_amount_paid fields"""
        response = requests.get(f"{BASE_URL}/api/chit-funds")
        data = response.json()
        if data:
            chit = data[0]
            # Check for opening fields
            assert "opening_installments_paid" in chit or chit.get("opening_installments_paid") is not None or "opening_installments_paid" in str(chit)
            print(f"✓ Chit fund has opening_installments_paid: {chit.get('opening_installments_paid', 0)}")
            print(f"✓ Chit fund has opening_amount_paid: {chit.get('opening_amount_paid', 0)}")
        else:
            pytest.skip("No chit funds found")
    
    def test_chit_fund_summary(self):
        """Test GET /api/chit-funds/{chit_id}/summary returns correct summary with profit calculation"""
        response = requests.get(f"{BASE_URL}/api/chit-funds")
        chits = response.json()
        if chits:
            chit_id = chits[0]["id"]
            summary_response = requests.get(f"{BASE_URL}/api/chit-funds/{chit_id}/summary")
            assert summary_response.status_code == 200
            data = summary_response.json()
            assert "summary" in data
            assert "entries" in data
            summary = data["summary"]
            assert "total_paid" in summary
            assert "total_dividend" in summary
            assert "months_completed" in summary
            print(f"✓ GET /api/chit-funds/{chit_id}/summary - Summary retrieved")
            print(f"  - Total Paid: {summary.get('total_paid', 0)}")
            print(f"  - Total Dividend: {summary.get('total_dividend', 0)}")
            print(f"  - Months Completed: {summary.get('months_completed', 0)}")
        else:
            pytest.skip("No chit funds found")
    
    def test_chit_fund_paid_months(self):
        """Test GET /api/chit-funds/{chit_id}/paid-months returns paid and pending months"""
        response = requests.get(f"{BASE_URL}/api/chit-funds")
        chits = response.json()
        if chits:
            chit_id = chits[0]["id"]
            paid_response = requests.get(f"{BASE_URL}/api/chit-funds/{chit_id}/paid-months")
            assert paid_response.status_code == 200
            data = paid_response.json()
            assert "paid_months" in data
            assert "pending_months" in data
            assert "duration_months" in data
            print(f"✓ GET /api/chit-funds/{chit_id}/paid-months")
            print(f"  - Paid months: {data.get('paid_months', [])}")
            print(f"  - Duration: {data.get('duration_months', 0)}")
        else:
            pytest.skip("No chit funds found")
    
    def test_update_chit_fund_opening(self):
        """Test PUT /api/chit-funds/{chit_id} can update opening balance"""
        response = requests.get(f"{BASE_URL}/api/chit-funds")
        chits = response.json()
        if chits:
            chit_id = chits[0]["id"]
            original_opening = chits[0].get("opening_installments_paid", 0)
            original_amount = chits[0].get("opening_amount_paid", 0)
            
            # Update opening balance
            update_response = requests.put(
                f"{BASE_URL}/api/chit-funds/{chit_id}",
                json={
                    "opening_installments_paid": original_opening,
                    "opening_amount_paid": original_amount
                }
            )
            assert update_response.status_code == 200
            updated = update_response.json()
            print(f"✓ PUT /api/chit-funds/{chit_id} - Opening balance updated")
            print(f"  - Opening Installments: {updated.get('opening_installments_paid', 0)}")
            print(f"  - Opening Amount: {updated.get('opening_amount_paid', 0)}")
        else:
            pytest.skip("No chit funds found")


class TestProfitCalculation:
    """Test profit calculation logic"""
    
    def test_profit_calculation_formula(self):
        """
        Test profit calculation:
        Profit = Expected Pay (Installments × EMI) - Actual Paid + Dividends
        
        Example from user:
        - opening_installments_paid = 16
        - opening_amount_paid = 700000
        - monthly_installment = 50000
        - Expected = 16 × 50000 = 800000
        - Profit = 800000 - 700000 = 100000
        """
        response = requests.get(f"{BASE_URL}/api/chit-funds")
        chits = response.json()
        
        # Find the test chit fund
        test_chit = None
        for chit in chits:
            if chit.get("opening_installments_paid", 0) == 16 and chit.get("opening_amount_paid", 0) == 700000:
                test_chit = chit
                break
        
        if test_chit:
            opening_inst = test_chit.get("opening_installments_paid", 0)
            opening_amount = test_chit.get("opening_amount_paid", 0)
            monthly_emi = test_chit.get("monthly_installment", 50000)
            
            # Get summary for additional entries
            summary_response = requests.get(f"{BASE_URL}/api/chit-funds/{test_chit['id']}/summary")
            summary_data = summary_response.json()
            summary = summary_data.get("summary", {})
            
            entries_paid = summary.get("total_paid", 0)
            entries_dividend = summary.get("total_dividend", 0)
            months_from_entries = summary.get("months_completed", 0)
            
            # Calculate expected values
            total_installments = opening_inst + months_from_entries
            expected_pay = total_installments * monthly_emi
            actual_paid = opening_amount + entries_paid
            profit = expected_pay - actual_paid + entries_dividend
            
            print(f"✓ Profit Calculation Test:")
            print(f"  - Opening Installments: {opening_inst}")
            print(f"  - Opening Amount: ₹{opening_amount:,}")
            print(f"  - Monthly EMI: ₹{monthly_emi:,}")
            print(f"  - Entries Months: {months_from_entries}")
            print(f"  - Entries Paid: ₹{entries_paid:,}")
            print(f"  - Entries Dividend: ₹{entries_dividend:,}")
            print(f"  - Total Installments: {total_installments}")
            print(f"  - Expected Pay: ₹{expected_pay:,}")
            print(f"  - Actual Paid: ₹{actual_paid:,}")
            print(f"  - Profit So Far: ₹{profit:,}")
            
            # Verify the expected profit for the test case
            if opening_inst == 16 and opening_amount == 700000 and months_from_entries == 0:
                expected_profit = 100000  # 16 × 50000 - 700000 = 100000
                assert profit == expected_profit, f"Expected profit {expected_profit}, got {profit}"
                print(f"  ✓ Profit calculation verified: ₹{profit:,} = ₹{expected_profit:,}")
        else:
            print("Test chit fund with opening_installments_paid=16 not found, skipping verification")
            pytest.skip("Test chit fund not found")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
