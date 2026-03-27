"""
Comprehensive Backend Tests for Staff Attendance & Salary Management App
Tests: Staff CRUD, Attendance, Salary Calculation (30-day basis), Advances
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndRoot:
    """Test API health and root endpoint"""
    
    def test_api_root(self):
        """Test API root returns correct message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Staff Attendance" in data["message"]
        print("✓ API root endpoint working")


class TestStaffCRUD:
    """Staff CRUD operations tests"""
    
    def test_get_all_staff(self):
        """Test fetching all staff"""
        response = requests.get(f"{BASE_URL}/api/staff")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get all staff - found {len(data)} staff members")
    
    def test_create_staff(self):
        """Test creating a new staff member"""
        payload = {
            "name": "TEST_John Doe",
            "phone": "9876543211",
            "joining_date": "2026-01-15",
            "monthly_salary": 30000.0
        }
        response = requests.post(f"{BASE_URL}/api/staff", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["phone"] == payload["phone"]
        assert data["monthly_salary"] == payload["monthly_salary"]
        assert "id" in data
        print(f"✓ Created staff: {data['name']} with ID: {data['id']}")
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/staff/{data['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == payload["name"]
        print("✓ Staff creation verified via GET")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/staff/{data['id']}")
    
    def test_get_staff_by_id(self):
        """Test fetching staff by ID"""
        # First get all staff
        all_staff = requests.get(f"{BASE_URL}/api/staff").json()
        if len(all_staff) > 0:
            staff_id = all_staff[0]["id"]
            response = requests.get(f"{BASE_URL}/api/staff/{staff_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == staff_id
            print(f"✓ Get staff by ID: {data['name']}")
        else:
            pytest.skip("No staff available to test")
    
    def test_update_staff(self):
        """Test updating staff details"""
        # Create a test staff first
        create_payload = {
            "name": "TEST_Update Staff",
            "phone": "9876543212",
            "joining_date": "2026-01-10",
            "monthly_salary": 25000.0
        }
        create_response = requests.post(f"{BASE_URL}/api/staff", json=create_payload)
        staff_id = create_response.json()["id"]
        
        # Update the staff
        update_payload = {"name": "TEST_Updated Name", "monthly_salary": 28000.0}
        update_response = requests.put(f"{BASE_URL}/api/staff/{staff_id}", json=update_payload)
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["name"] == "TEST_Updated Name"
        assert updated["monthly_salary"] == 28000.0
        print("✓ Staff updated successfully")
        
        # Verify persistence
        get_response = requests.get(f"{BASE_URL}/api/staff/{staff_id}")
        fetched = get_response.json()
        assert fetched["name"] == "TEST_Updated Name"
        print("✓ Staff update verified via GET")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/staff/{staff_id}")
    
    def test_delete_staff(self):
        """Test deleting staff"""
        # Create a test staff first
        create_payload = {
            "name": "TEST_Delete Staff",
            "phone": "9876543213",
            "joining_date": "2026-01-05",
            "monthly_salary": 20000.0
        }
        create_response = requests.post(f"{BASE_URL}/api/staff", json=create_payload)
        staff_id = create_response.json()["id"]
        
        # Delete the staff
        delete_response = requests.delete(f"{BASE_URL}/api/staff/{staff_id}")
        assert delete_response.status_code == 200
        print("✓ Staff deleted successfully")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/staff/{staff_id}")
        assert get_response.status_code == 404
        print("✓ Staff deletion verified (404 on GET)")
    
    def test_get_nonexistent_staff(self):
        """Test fetching non-existent staff returns 404"""
        response = requests.get(f"{BASE_URL}/api/staff/nonexistent-id-12345")
        assert response.status_code == 404
        print("✓ Non-existent staff returns 404")


class TestAttendance:
    """Attendance marking and retrieval tests"""
    
    @pytest.fixture(autouse=True)
    def setup_staff(self):
        """Create a test staff for attendance tests"""
        payload = {
            "name": "TEST_Attendance Staff",
            "phone": "9876543214",
            "joining_date": "2026-01-01",
            "monthly_salary": 30000.0
        }
        response = requests.post(f"{BASE_URL}/api/staff", json=payload)
        self.staff_id = response.json()["id"]
        yield
        # Cleanup
        requests.delete(f"{BASE_URL}/api/staff/{self.staff_id}")
    
    def test_mark_attendance_present(self):
        """Test marking attendance as present"""
        payload = {
            "staff_id": self.staff_id,
            "date": "2026-01-15",
            "status": "present"
        }
        response = requests.post(f"{BASE_URL}/api/attendance", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "present"
        assert data["staff_id"] == self.staff_id
        print("✓ Marked attendance as present")
    
    def test_mark_attendance_absent(self):
        """Test marking attendance as absent"""
        payload = {
            "staff_id": self.staff_id,
            "date": "2026-01-16",
            "status": "absent"
        }
        response = requests.post(f"{BASE_URL}/api/attendance", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "absent"
        print("✓ Marked attendance as absent")
    
    def test_mark_attendance_half_day(self):
        """Test marking attendance as half day"""
        payload = {
            "staff_id": self.staff_id,
            "date": "2026-01-17",
            "status": "half_day"
        }
        response = requests.post(f"{BASE_URL}/api/attendance", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "half_day"
        print("✓ Marked attendance as half day")
    
    def test_update_existing_attendance(self):
        """Test updating existing attendance record"""
        # First mark as present
        payload = {
            "staff_id": self.staff_id,
            "date": "2026-01-18",
            "status": "present"
        }
        requests.post(f"{BASE_URL}/api/attendance", json=payload)
        
        # Update to absent
        payload["status"] = "absent"
        response = requests.post(f"{BASE_URL}/api/attendance", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "absent"
        print("✓ Updated existing attendance record")
    
    def test_get_attendance_by_month(self):
        """Test fetching attendance by month"""
        # Mark some attendance first
        for day in ["2026-01-10", "2026-01-11", "2026-01-12"]:
            requests.post(f"{BASE_URL}/api/attendance", json={
                "staff_id": self.staff_id,
                "date": day,
                "status": "present"
            })
        
        response = requests.get(f"{BASE_URL}/api/attendance/{self.staff_id}/2026-01")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3
        print(f"✓ Get attendance by month - found {len(data)} records")
    
    def test_get_attendance_by_date(self):
        """Test fetching attendance by date"""
        # Mark attendance for today
        today = datetime.now().strftime("%Y-%m-%d")
        requests.post(f"{BASE_URL}/api/attendance", json={
            "staff_id": self.staff_id,
            "date": today,
            "status": "present"
        })
        
        response = requests.get(f"{BASE_URL}/api/attendance/date/{today}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get attendance by date - found {len(data)} records")


class TestSalaryCalculation:
    """Salary calculation tests - verifying 30-day basis formula"""
    
    @pytest.fixture(autouse=True)
    def setup_staff_with_attendance(self):
        """Create staff with attendance for salary tests"""
        # Create staff with 30000 monthly salary (daily rate = 1000)
        payload = {
            "name": "TEST_Salary Staff",
            "phone": "9876543215",
            "joining_date": "2026-01-01",
            "monthly_salary": 30000.0
        }
        response = requests.post(f"{BASE_URL}/api/staff", json=payload)
        self.staff_id = response.json()["id"]
        
        # Mark attendance: 10 present, 5 absent, 3 half days
        for i in range(1, 11):
            requests.post(f"{BASE_URL}/api/attendance", json={
                "staff_id": self.staff_id,
                "date": f"2026-01-{i:02d}",
                "status": "present"
            })
        for i in range(11, 16):
            requests.post(f"{BASE_URL}/api/attendance", json={
                "staff_id": self.staff_id,
                "date": f"2026-01-{i:02d}",
                "status": "absent"
            })
        for i in range(16, 19):
            requests.post(f"{BASE_URL}/api/attendance", json={
                "staff_id": self.staff_id,
                "date": f"2026-01-{i:02d}",
                "status": "half_day"
            })
        yield
        # Cleanup
        requests.delete(f"{BASE_URL}/api/staff/{self.staff_id}")
    
    def test_salary_calculation_30_day_basis(self):
        """Test salary calculation uses 30-day basis"""
        response = requests.get(f"{BASE_URL}/api/salary/{self.staff_id}/2026-01")
        assert response.status_code == 200
        data = response.json()
        
        # Verify 30-day basis: daily_rate = 30000 / 30 = 1000
        assert data["daily_rate"] == 1000.0
        assert data["monthly_salary"] == 30000.0
        print(f"✓ Daily rate calculated correctly: {data['daily_rate']} (30000/30)")
    
    def test_salary_attendance_counts(self):
        """Test salary calculation attendance counts"""
        response = requests.get(f"{BASE_URL}/api/salary/{self.staff_id}/2026-01")
        data = response.json()
        
        assert data["total_present"] == 10
        assert data["total_absent"] == 5
        assert data["total_half_day"] == 3
        assert data["total_working_days"] == 18  # 10 + 5 + 3
        print(f"✓ Attendance counts: P={data['total_present']}, A={data['total_absent']}, H={data['total_half_day']}")
    
    def test_salary_earned_calculation(self):
        """Test salary earned calculation"""
        response = requests.get(f"{BASE_URL}/api/salary/{self.staff_id}/2026-01")
        data = response.json()
        
        # present_amount = 10 * 1000 = 10000
        # half_day_amount = 3 * 500 = 1500
        # total_earned = 10000 + 1500 = 11500
        assert data["present_amount"] == 10000.0
        assert data["half_day_amount"] == 1500.0
        assert data["total_earned"] == 11500.0
        print(f"✓ Salary earned: ₹{data['total_earned']} (Present: ₹{data['present_amount']} + Half: ₹{data['half_day_amount']})")
    
    def test_salary_deducted_calculation(self):
        """Test salary deducted calculation"""
        response = requests.get(f"{BASE_URL}/api/salary/{self.staff_id}/2026-01")
        data = response.json()
        
        # total_deducted = (5 * 1000) + (3 * 500) = 5000 + 1500 = 6500
        assert data["total_deducted"] == 6500.0
        print(f"✓ Salary deducted: ₹{data['total_deducted']}")


class TestAdvances:
    """Advance salary feature tests"""
    
    @pytest.fixture(autouse=True)
    def setup_staff(self):
        """Create a test staff for advance tests"""
        payload = {
            "name": "TEST_Advance Staff",
            "phone": "9876543216",
            "joining_date": "2026-01-01",
            "monthly_salary": 25000.0
        }
        response = requests.post(f"{BASE_URL}/api/staff", json=payload)
        self.staff_id = response.json()["id"]
        yield
        # Cleanup
        requests.delete(f"{BASE_URL}/api/staff/{self.staff_id}")
    
    def test_create_advance(self):
        """Test creating an advance record"""
        payload = {
            "staff_id": self.staff_id,
            "amount": 5000.0,
            "date": "2026-01-20",
            "note": "TEST_Emergency advance"
        }
        response = requests.post(f"{BASE_URL}/api/advances", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 5000.0
        assert data["staff_id"] == self.staff_id
        assert "id" in data
        print(f"✓ Created advance: ₹{data['amount']} with ID: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/advances/{data['id']}")
    
    def test_get_all_advances(self):
        """Test fetching all advances"""
        # Create an advance first
        payload = {
            "staff_id": self.staff_id,
            "amount": 3000.0,
            "date": "2026-01-21",
            "note": "TEST_Advance"
        }
        create_response = requests.post(f"{BASE_URL}/api/advances", json=payload)
        advance_id = create_response.json()["id"]
        
        response = requests.get(f"{BASE_URL}/api/advances")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get all advances - found {len(data)} records")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/advances/{advance_id}")
    
    def test_get_staff_advances(self):
        """Test fetching advances for specific staff"""
        # Create advances
        for i, amount in enumerate([2000, 3000]):
            requests.post(f"{BASE_URL}/api/advances", json={
                "staff_id": self.staff_id,
                "amount": amount,
                "date": f"2026-01-{22+i}",
                "note": f"TEST_Advance {i+1}"
            })
        
        response = requests.get(f"{BASE_URL}/api/advances/{self.staff_id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2
        print(f"✓ Get staff advances - found {len(data)} records")
    
    def test_get_advances_by_month(self):
        """Test fetching advances by month"""
        # Create an advance
        payload = {
            "staff_id": self.staff_id,
            "amount": 4000.0,
            "date": "2026-01-25",
            "note": "TEST_Monthly advance"
        }
        create_response = requests.post(f"{BASE_URL}/api/advances", json=payload)
        advance_id = create_response.json()["id"]
        
        response = requests.get(f"{BASE_URL}/api/advances/month/2026-01")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get advances by month - found {len(data)} records")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/advances/{advance_id}")
    
    def test_delete_advance(self):
        """Test deleting an advance record"""
        # Create an advance
        payload = {
            "staff_id": self.staff_id,
            "amount": 1000.0,
            "date": "2026-01-26",
            "note": "TEST_To be deleted"
        }
        create_response = requests.post(f"{BASE_URL}/api/advances", json=payload)
        advance_id = create_response.json()["id"]
        
        # Delete the advance
        delete_response = requests.delete(f"{BASE_URL}/api/advances/{advance_id}")
        assert delete_response.status_code == 200
        print("✓ Advance deleted successfully")
    
    def test_advance_summary(self):
        """Test advance summary by month"""
        # Create advances
        requests.post(f"{BASE_URL}/api/advances", json={
            "staff_id": self.staff_id,
            "amount": 2500.0,
            "date": "2026-01-27",
            "note": "TEST_Summary advance"
        })
        
        response = requests.get(f"{BASE_URL}/api/advances/summary/2026-01")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get advance summary - found {len(data)} staff summaries")
    
    def test_create_advance_invalid_staff(self):
        """Test creating advance for non-existent staff returns 404"""
        payload = {
            "staff_id": "nonexistent-staff-id",
            "amount": 1000.0,
            "date": "2026-01-28",
            "note": "TEST_Invalid"
        }
        response = requests.post(f"{BASE_URL}/api/advances", json=payload)
        assert response.status_code == 404
        print("✓ Advance for non-existent staff returns 404")


class TestWhatsNewAndVersion:
    """What's New and App Version tests"""
    
    def test_get_whats_new(self):
        """Test fetching what's new items"""
        response = requests.get(f"{BASE_URL}/api/whats-new")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get what's new - found {len(data)} items")
    
    def test_get_app_version(self):
        """Test fetching app version"""
        response = requests.get(f"{BASE_URL}/api/app-version")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        print(f"✓ Get app version: {data['version']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
