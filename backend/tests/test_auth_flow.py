"""
Test Auth Flow for Staff Manager App
- Password-only login with default password 1234
- Login with wrong password should show error
- Password change functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthFlow:
    """Authentication endpoint tests"""
    
    def test_login_with_correct_password(self):
        """Test login with default password 1234"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "password": "1234"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "message" in data
        print(f"Login success: {data}")
    
    def test_login_with_wrong_password(self):
        """Test login with wrong password should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"Wrong password error: {data}")
    
    def test_login_with_empty_password(self):
        """Test login with empty password should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "password": ""
        })
        # Should return 401 for wrong password
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"Empty password error: {response.json()}")


class TestPasswordChange:
    """Password change tests"""
    
    def test_change_password_with_wrong_current(self):
        """Test password change with wrong current password"""
        response = requests.post(f"{BASE_URL}/api/auth/change-password", json={
            "current_password": "wrongcurrent",
            "new_password": "newpass123"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"Wrong current password error: {data}")
    
    def test_change_password_success(self):
        """Test password change with correct current password"""
        # First change to a new password
        response = requests.post(f"{BASE_URL}/api/auth/change-password", json={
            "current_password": "1234",
            "new_password": "testpass5678"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"Password changed: {data}")
        
        # Verify new password works
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "password": "testpass5678"
        })
        assert login_response.status_code == 200, f"Login with new password failed: {login_response.text}"
        print("Login with new password successful")
        
        # Change back to default password for other tests
        revert_response = requests.post(f"{BASE_URL}/api/auth/change-password", json={
            "current_password": "testpass5678",
            "new_password": "1234"
        })
        assert revert_response.status_code == 200, f"Revert password failed: {revert_response.text}"
        print("Password reverted to 1234")


class TestAutoRefreshSettings:
    """Auto-refresh settings tests"""
    
    def test_get_auto_refresh_settings(self):
        """Test getting auto-refresh settings"""
        response = requests.get(f"{BASE_URL}/api/settings/auto-refresh")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "enabled" in data
        assert "interval" in data
        print(f"Auto-refresh settings: {data}")
    
    def test_set_auto_refresh_enabled(self):
        """Test enabling auto-refresh"""
        response = requests.post(f"{BASE_URL}/api/settings/auto-refresh?enabled=true&interval=30")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("enabled") == True
        print(f"Auto-refresh enabled: {data}")
    
    def test_set_auto_refresh_disabled(self):
        """Test disabling auto-refresh"""
        response = requests.post(f"{BASE_URL}/api/settings/auto-refresh?enabled=false")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("enabled") == False
        print(f"Auto-refresh disabled: {data}")


class TestFinancialYearAPI:
    """Financial Year API tests"""
    
    def test_get_active_fy(self):
        """Test getting active financial year"""
        response = requests.get(f"{BASE_URL}/api/financial-years/active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "name" in data
        assert "start_date" in data
        assert "end_date" in data
        print(f"Active FY: {data}")
    
    def test_get_all_financial_years(self):
        """Test getting all financial years"""
        response = requests.get(f"{BASE_URL}/api/financial-years")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"All FYs: {len(data)} found")


class TestBasicAPIs:
    """Basic API health checks"""
    
    def test_root_api(self):
        """Test root API endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Root API: {data}")
    
    def test_staff_list(self):
        """Test staff list endpoint"""
        response = requests.get(f"{BASE_URL}/api/staff")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Staff count: {len(data)}")
    
    def test_parties_list(self):
        """Test parties list endpoint"""
        response = requests.get(f"{BASE_URL}/api/parties")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Parties count: {len(data)}")
    
    def test_chit_funds_list(self):
        """Test chit funds list endpoint"""
        response = requests.get(f"{BASE_URL}/api/chit-funds")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Chit funds count: {len(data)}")
    
    def test_interest_accounts_list(self):
        """Test interest accounts list endpoint"""
        response = requests.get(f"{BASE_URL}/api/interest-accounts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Interest accounts count: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
