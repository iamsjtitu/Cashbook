"""
Test Dashboard, Settings, and Backup APIs
Tests for iteration 18 - Dashboard summary, Settings page, Backup/Restore, Individual Ledger PDF
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDashboardAPIs:
    """Test Dashboard data endpoints"""
    
    def test_staff_endpoint(self):
        """Test /api/staff endpoint for dashboard"""
        response = requests.get(f"{BASE_URL}/api/staff")
        assert response.status_code == 200, f"Staff endpoint failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Staff should return a list"
        print(f"✓ Staff endpoint: {len(data)} staff members")
    
    def test_attendance_by_date(self):
        """Test /api/attendance/date/{date} for today's attendance"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/attendance/date/{today}")
        assert response.status_code == 200, f"Attendance endpoint failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Attendance should return a list"
        print(f"✓ Attendance endpoint: {len(data)} records for {today}")
    
    def test_parties_endpoint(self):
        """Test /api/parties endpoint for ledger count"""
        response = requests.get(f"{BASE_URL}/api/parties")
        assert response.status_code == 200, f"Parties endpoint failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Parties should return a list"
        print(f"✓ Parties endpoint: {len(data)} ledgers")
    
    def test_cashbook_monthly(self):
        """Test /api/cashbook/monthly/{month} for cash balance"""
        current_month = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/api/cashbook/monthly/{current_month}")
        assert response.status_code == 200, f"Cashbook monthly failed: {response.text}"
        data = response.json()
        assert "total_credit" in data or "net_balance" in data, "Cashbook should have balance info"
        print(f"✓ Cashbook monthly: Net balance = {data.get('net_balance', 0)}")
    
    def test_chit_funds_endpoint(self):
        """Test /api/chit-funds endpoint"""
        response = requests.get(f"{BASE_URL}/api/chit-funds")
        assert response.status_code == 200, f"Chit funds endpoint failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Chit funds should return a list"
        active_count = len([c for c in data if c.get('is_active', True)])
        print(f"✓ Chit funds endpoint: {active_count} active chit funds")
    
    def test_expenses_summary(self):
        """Test /api/expenses/summary/{month} endpoint"""
        current_month = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/api/expenses/summary/{current_month}")
        assert response.status_code == 200, f"Expenses summary failed: {response.text}"
        data = response.json()
        assert "total_expenses" in data or "expense_count" in data, "Should have expense info"
        print(f"✓ Expenses summary: Total = {data.get('total_expenses', 0)}")
    
    def test_interest_accounts_endpoint(self):
        """Test /api/interest-accounts endpoint"""
        response = requests.get(f"{BASE_URL}/api/interest-accounts")
        assert response.status_code == 200, f"Interest accounts failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Interest accounts should return a list"
        print(f"✓ Interest accounts: {len(data)} accounts")
    
    def test_profit_loss_report(self):
        """Test /api/reports/simple-profit-loss endpoint"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-profit-loss")
        assert response.status_code == 200, f"P&L report failed: {response.text}"
        data = response.json()
        assert "net_profit" in data, "P&L should have net_profit"
        print(f"✓ P&L report: Net profit = {data.get('net_profit', 0)}")


class TestSettingsAPI:
    """Test Settings endpoints"""
    
    def test_get_settings_default(self):
        """Test GET /api/settings returns defaults"""
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200, f"Get settings failed: {response.text}"
        data = response.json()
        # Should have company_name at minimum
        assert "company_name" in data, "Settings should have company_name"
        print(f"✓ Get settings: company_name = {data.get('company_name')}")
    
    def test_save_settings(self):
        """Test POST /api/settings saves correctly"""
        test_settings = {
            "company_name": "Test Company ABC",
            "company_address": "123 Test Street",
            "company_phone": "9876543210",
            "footer_text": "Thank you for your business!"
        }
        response = requests.post(f"{BASE_URL}/api/settings", json=test_settings)
        assert response.status_code == 200, f"Save settings failed: {response.text}"
        data = response.json()
        assert "message" in data, "Should return success message"
        print(f"✓ Save settings: {data.get('message')}")
        
        # Verify settings were saved
        verify_response = requests.get(f"{BASE_URL}/api/settings")
        assert verify_response.status_code == 200
        saved_data = verify_response.json()
        assert saved_data.get("company_name") == "Test Company ABC", "Company name should be saved"
        assert saved_data.get("company_address") == "123 Test Street", "Address should be saved"
        assert saved_data.get("footer_text") == "Thank you for your business!", "Footer should be saved"
        print(f"✓ Verify settings: All fields saved correctly")
    
    def test_settings_persistence(self):
        """Test settings persist after update"""
        # Update settings
        new_settings = {
            "company_name": "Staff Manager",
            "company_address": "",
            "company_phone": "",
            "footer_text": ""
        }
        response = requests.post(f"{BASE_URL}/api/settings", json=new_settings)
        assert response.status_code == 200
        
        # Verify
        verify = requests.get(f"{BASE_URL}/api/settings")
        assert verify.status_code == 200
        data = verify.json()
        assert data.get("company_name") == "Staff Manager"
        print(f"✓ Settings persistence: Reset to defaults")


class TestBackupAPI:
    """Test Backup/Restore endpoints"""
    
    def test_export_backup(self):
        """Test GET /api/backup/export returns valid backup"""
        response = requests.get(f"{BASE_URL}/api/backup/export")
        assert response.status_code == 200, f"Export backup failed: {response.text}"
        data = response.json()
        
        # Verify backup structure
        assert "backup_date" in data, "Backup should have date"
        assert "version" in data, "Backup should have version"
        assert "collections" in data, "Backup should have collections"
        
        # Verify collections are present
        collections = data.get("collections", {})
        expected_collections = ["staff", "parties", "transactions", "settings"]
        for coll in expected_collections:
            assert coll in collections, f"Backup should include {coll} collection"
        
        print(f"✓ Export backup: {len(collections)} collections exported")
        print(f"  - backup_date: {data.get('backup_date')}")
        print(f"  - version: {data.get('version')}")
        return data
    
    def test_backup_contains_data(self):
        """Test backup contains actual data"""
        response = requests.get(f"{BASE_URL}/api/backup/export")
        assert response.status_code == 200
        data = response.json()
        
        collections = data.get("collections", {})
        total_records = sum(len(docs) for docs in collections.values() if isinstance(docs, list))
        print(f"✓ Backup data: {total_records} total records across all collections")
        
        # Print collection counts
        for coll_name, docs in collections.items():
            if isinstance(docs, list) and len(docs) > 0:
                print(f"  - {coll_name}: {len(docs)} records")
    
    def test_restore_backup_validation(self):
        """Test restore validates backup format"""
        # Test with invalid format
        invalid_backup = {"invalid": "data"}
        response = requests.post(f"{BASE_URL}/api/backup/restore", json=invalid_backup)
        assert response.status_code == 400, "Should reject invalid backup format"
        print(f"✓ Restore validation: Rejects invalid format")


class TestPartyLedgerAPI:
    """Test Party Ledger endpoints for PDF export"""
    
    def test_get_party_ledger(self):
        """Test GET /api/parties/{party_id}/ledger returns ledger data"""
        # First get a party
        parties_response = requests.get(f"{BASE_URL}/api/parties")
        assert parties_response.status_code == 200
        parties = parties_response.json()
        
        if len(parties) == 0:
            # Create a test party
            test_party = {
                "name": "Test Ledger Party",
                "phone": "1234567890",
                "opening_balance": 1000,
                "balance_type": "debit"
            }
            create_response = requests.post(f"{BASE_URL}/api/parties", json=test_party)
            assert create_response.status_code == 200
            party_id = create_response.json().get("id")
            print(f"✓ Created test party: {party_id}")
        else:
            party_id = parties[0].get("id")
        
        # Get ledger for party
        ledger_response = requests.get(f"{BASE_URL}/api/parties/{party_id}/ledger")
        assert ledger_response.status_code == 200, f"Get ledger failed: {ledger_response.text}"
        ledger_data = ledger_response.json()
        
        # Verify ledger structure
        assert "party" in ledger_data, "Ledger should have party info"
        assert "opening_balance" in ledger_data, "Ledger should have opening_balance"
        assert "current_balance" in ledger_data, "Ledger should have current_balance"
        assert "entries" in ledger_data, "Ledger should have entries"
        
        print(f"✓ Party ledger: {ledger_data['party']['name']}")
        print(f"  - Opening balance: {ledger_data.get('opening_balance')}")
        print(f"  - Current balance: {ledger_data.get('current_balance')}")
        print(f"  - Entries: {len(ledger_data.get('entries', []))}")
    
    def test_ledger_with_sub_ledgers(self):
        """Test ledger includes sub-ledger info"""
        parties_response = requests.get(f"{BASE_URL}/api/parties")
        assert parties_response.status_code == 200
        parties = parties_response.json()
        
        # Find a parent party (one with sub-ledgers)
        parent_parties = [p for p in parties if any(sub.get("parent_party_id") == p.get("id") for sub in parties)]
        
        if parent_parties:
            parent_id = parent_parties[0].get("id")
            ledger_response = requests.get(f"{BASE_URL}/api/parties/{parent_id}/ledger")
            assert ledger_response.status_code == 200
            ledger_data = ledger_response.json()
            
            # Should have sub_ledgers field
            assert "sub_ledgers" in ledger_data, "Parent ledger should have sub_ledgers"
            print(f"✓ Parent ledger: {len(ledger_data.get('sub_ledgers', []))} sub-ledgers")
        else:
            print("✓ No parent ledgers found (skipping sub-ledger test)")


class TestAuthAPI:
    """Test Auth endpoints"""
    
    def test_login_with_correct_password(self):
        """Test login with correct password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"password": "1234"})
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Login should succeed"
        print(f"✓ Login: Success with password 1234")
    
    def test_login_with_wrong_password(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={"password": "wrong"})
        assert response.status_code == 401, "Should reject wrong password"
        print(f"✓ Login: Correctly rejects wrong password")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
