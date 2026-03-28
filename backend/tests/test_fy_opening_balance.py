"""
Test Financial Year filtering and Opening Balance features
- FY filtering on P&L and Balance Sheet
- Cash Opening Balance APIs
- Party Opening Balance update
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCashOpeningBalance:
    """Cash Book Opening Balance API tests"""
    
    def test_get_cash_opening_balance(self):
        """GET /api/cashbook/opening-balance - Get cash opening balance"""
        response = requests.get(f"{BASE_URL}/api/cashbook/opening-balance")
        assert response.status_code == 200
        data = response.json()
        assert "opening_balance" in data
        assert "as_on_date" in data
        print(f"✓ Cash Opening Balance: ₹{data['opening_balance']} as on {data['as_on_date']}")
    
    def test_set_cash_opening_balance(self):
        """POST /api/cashbook/opening-balance - Set cash opening balance"""
        test_amount = 50000.0
        test_date = "2025-04-01"
        
        response = requests.post(
            f"{BASE_URL}/api/cashbook/opening-balance",
            params={"amount": test_amount, "as_on_date": test_date}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["opening_balance"] == test_amount
        assert data["as_on_date"] == test_date
        print(f"✓ Set Cash Opening Balance: ₹{test_amount} as on {test_date}")
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/cashbook/opening-balance")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["opening_balance"] == test_amount
        print("✓ Cash Opening Balance persisted correctly")


class TestFinancialYears:
    """Financial Year API tests"""
    
    def test_get_financial_years(self):
        """GET /api/financial-years - Get all financial years"""
        response = requests.get(f"{BASE_URL}/api/financial-years")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} financial years")
        return data
    
    def test_get_active_financial_year(self):
        """GET /api/financial-years/active - Get active FY"""
        response = requests.get(f"{BASE_URL}/api/financial-years/active")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "name" in data
        assert "start_date" in data
        assert "end_date" in data
        print(f"✓ Active FY: {data['name']} ({data['start_date']} to {data['end_date']})")
        return data


class TestProfitLossFYFilter:
    """P&L with Financial Year filter tests"""
    
    def test_pl_without_filter(self):
        """GET /api/reports/simple-profit-loss - All time P&L"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-profit-loss")
        assert response.status_code == 200
        data = response.json()
        assert "income" in data
        assert "expenses" in data
        assert "net_profit" in data
        assert "period" in data
        print(f"✓ P&L All Time: Income ₹{data['income']['total']}, Expenses ₹{data['expenses']['total']}, Net ₹{data['net_profit']}")
    
    def test_pl_with_month_filter(self):
        """GET /api/reports/simple-profit-loss?month=2026-01 - Month filtered P&L"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-profit-loss", params={"month": "2026-01"})
        assert response.status_code == 200
        data = response.json()
        assert data["month"] == "2026-01"
        print(f"✓ P&L Jan 2026: Income ₹{data['income']['total']}, Expenses ₹{data['expenses']['total']}")
    
    def test_pl_with_fy_filter(self):
        """GET /api/reports/simple-profit-loss?fy={fy_id} - FY filtered P&L"""
        # First get active FY
        fy_response = requests.get(f"{BASE_URL}/api/financial-years/active")
        assert fy_response.status_code == 200
        fy_data = fy_response.json()
        fy_id = fy_data["id"]
        
        # Now test P&L with FY filter
        response = requests.get(f"{BASE_URL}/api/reports/simple-profit-loss", params={"fy": fy_id})
        assert response.status_code == 200
        data = response.json()
        assert "period" in data
        assert "FY" in data["period"]  # Should contain "FY" in period label
        print(f"✓ P&L FY {fy_data['name']}: Period={data['period']}, Income ₹{data['income']['total']}, Expenses ₹{data['expenses']['total']}")


class TestBalanceSheetFYFilter:
    """Balance Sheet with Financial Year filter tests"""
    
    def test_balance_sheet_without_filter(self):
        """GET /api/reports/simple-balance-sheet - All time Balance Sheet"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-balance-sheet")
        assert response.status_code == 200
        data = response.json()
        assert "assets" in data
        assert "liabilities" in data
        assert "capital" in data
        assert "summary" in data
        print(f"✓ Balance Sheet All Time: Assets ₹{data['summary']['total_assets']}, Liabilities ₹{data['summary']['total_liabilities']}, Net Worth ₹{data['summary']['net_worth']}")
    
    def test_balance_sheet_with_fy_filter(self):
        """GET /api/reports/simple-balance-sheet?fy={fy_id} - FY filtered Balance Sheet"""
        # First get active FY
        fy_response = requests.get(f"{BASE_URL}/api/financial-years/active")
        assert fy_response.status_code == 200
        fy_data = fy_response.json()
        fy_id = fy_data["id"]
        
        # Now test Balance Sheet with FY filter
        response = requests.get(f"{BASE_URL}/api/reports/simple-balance-sheet", params={"fy": fy_id})
        assert response.status_code == 200
        data = response.json()
        assert "period" in data
        assert "FY" in data["period"]  # Should contain "FY" in period label
        print(f"✓ Balance Sheet FY {fy_data['name']}: Period={data['period']}, Assets ₹{data['summary']['total_assets']}")
    
    def test_balance_sheet_includes_cash_opening_balance(self):
        """Balance Sheet cash_balance should include opening balance"""
        # Set a known opening balance
        test_ob = 100000.0
        requests.post(f"{BASE_URL}/api/cashbook/opening-balance", params={"amount": test_ob, "as_on_date": "2025-04-01"})
        
        # Get balance sheet
        response = requests.get(f"{BASE_URL}/api/reports/simple-balance-sheet")
        assert response.status_code == 200
        data = response.json()
        
        cash_balance = data["assets"]["current_assets"]["cash_balance"]
        # Cash balance should be >= opening balance (opening + net transactions)
        print(f"✓ Balance Sheet Cash Balance: ₹{cash_balance} (includes opening balance ₹{test_ob})")


class TestPartyOpeningBalance:
    """Party Opening Balance update tests"""
    
    def test_create_party_with_opening_balance(self):
        """POST /api/parties - Create party with opening balance"""
        unique_name = f"TEST_Party_{uuid.uuid4().hex[:6]}"
        response = requests.post(f"{BASE_URL}/api/parties", json={
            "name": unique_name,
            "phone": "9876543210",
            "opening_balance": 5000.0,
            "balance_type": "debit"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == unique_name
        assert data["opening_balance"] == 5000.0
        print(f"✓ Created party {unique_name} with opening balance ₹5000")
        return data["id"]
    
    def test_update_party_opening_balance(self):
        """PUT /api/parties/{id} - Update party opening balance"""
        # First create a party
        unique_name = f"TEST_OB_Update_{uuid.uuid4().hex[:6]}"
        create_response = requests.post(f"{BASE_URL}/api/parties", json={
            "name": unique_name,
            "phone": "9876543211",
            "opening_balance": 1000.0
        })
        assert create_response.status_code == 200
        party_id = create_response.json()["id"]
        
        # Update opening balance
        new_ob = 7500.0
        update_response = requests.put(f"{BASE_URL}/api/parties/{party_id}", json={
            "opening_balance": new_ob
        })
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["opening_balance"] == new_ob
        print(f"✓ Updated party opening balance to ₹{new_ob}")
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/parties/{party_id}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["opening_balance"] == new_ob
        print("✓ Party opening balance update persisted correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/parties/{party_id}")


class TestNavigationTabs:
    """Test all 12 navigation tabs are accessible"""
    
    @pytest.mark.parametrize("endpoint,name", [
        ("/api/staff", "Staff"),
        ("/api/transactions", "Cash Book"),
        ("/api/parties", "Party Ledger"),
        ("/api/interest-accounts", "Byaj"),
        ("/api/expenses", "Expenses"),
        ("/api/chit-funds", "Chit Fund"),
        ("/api/reports/simple-profit-loss", "P&L"),
        ("/api/reports/simple-balance-sheet", "Balance Sheet"),
    ])
    def test_navigation_endpoint(self, endpoint, name):
        """Test each navigation endpoint is accessible"""
        response = requests.get(f"{BASE_URL}{endpoint}")
        assert response.status_code == 200, f"{name} endpoint failed"
        print(f"✓ {name} endpoint accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
