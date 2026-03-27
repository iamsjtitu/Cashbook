import requests
import sys
from datetime import datetime, date
import json

class StaffAttendanceAPITester:
    def __init__(self, base_url="https://employee-track-pay.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_staff_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if method == 'GET' and isinstance(response_data, list):
                        print(f"   Response: {len(response_data)} items returned")
                    elif method in ['POST', 'PUT'] and isinstance(response_data, dict):
                        print(f"   Response: {response_data.get('name', response_data.get('message', 'Success'))}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            return success, response.json() if response.text and response.status_code < 500 else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API",
            "GET",
            "",
            200
        )
        return success

    def test_staff_crud(self):
        """Test complete staff CRUD operations"""
        print("\n📋 Testing Staff CRUD Operations...")
        
        # Test 1: Get all staff (initially empty)
        success, staff_list = self.run_test(
            "Get All Staff (Empty)",
            "GET",
            "staff",
            200
        )
        if not success:
            return False

        # Test 2: Create new staff
        test_staff = {
            "name": f"Test Staff {datetime.now().strftime('%H%M%S')}",
            "phone": "9876543210",
            "joining_date": "2024-01-15",
            "monthly_salary": 25000.0
        }
        
        success, created_staff = self.run_test(
            "Create Staff",
            "POST",
            "staff",
            200,
            data=test_staff
        )
        if not success or not created_staff.get('id'):
            return False
        
        staff_id = created_staff['id']
        self.created_staff_ids.append(staff_id)

        # Test 3: Get specific staff
        success, _ = self.run_test(
            "Get Specific Staff",
            "GET",
            f"staff/{staff_id}",
            200
        )
        if not success:
            return False

        # Test 4: Update staff
        update_data = {
            "monthly_salary": 30000.0,
            "phone": "9876543211"
        }
        success, _ = self.run_test(
            "Update Staff",
            "PUT",
            f"staff/{staff_id}",
            200,
            data=update_data
        )
        if not success:
            return False

        # Test 5: Get all staff (should have 1 now)
        success, updated_staff_list = self.run_test(
            "Get All Staff (After Create)",
            "GET",
            "staff",
            200
        )
        
        return success and len(updated_staff_list) >= 1

    def test_attendance_operations(self):
        """Test attendance marking and retrieval"""
        print("\n📅 Testing Attendance Operations...")
        
        if not self.created_staff_ids:
            print("❌ No staff created for attendance testing")
            return False
        
        staff_id = self.created_staff_ids[0]
        today = date.today().strftime("%Y-%m-%d")
        current_month = date.today().strftime("%Y-%m")
        
        # Test 1: Mark attendance as present
        attendance_data = {
            "staff_id": staff_id,
            "date": today,
            "status": "present"
        }
        
        success, _ = self.run_test(
            "Mark Attendance (Present)",
            "POST",
            "attendance",
            200,
            data=attendance_data
        )
        if not success:
            return False

        # Test 2: Get attendance by date
        success, attendance_list = self.run_test(
            "Get Attendance by Date",
            "GET",
            f"attendance/date/{today}",
            200
        )
        if not success:
            return False

        # Test 3: Get staff attendance for month
        success, _ = self.run_test(
            "Get Staff Monthly Attendance",
            "GET",
            f"attendance/{staff_id}/{current_month}",
            200
        )
        if not success:
            return False

        # Test 4: Update attendance to half day
        attendance_data["status"] = "half_day"
        success, _ = self.run_test(
            "Update Attendance (Half Day)",
            "POST",
            "attendance",
            200,
            data=attendance_data
        )
        
        return success

    def test_salary_calculation(self):
        """Test salary calculation"""
        print("\n💰 Testing Salary Calculation...")
        
        if not self.created_staff_ids:
            print("❌ No staff created for salary testing")
            return False
        
        staff_id = self.created_staff_ids[0]
        current_month = date.today().strftime("%Y-%m")
        
        success, salary_data = self.run_test(
            "Calculate Salary",
            "GET",
            f"salary/{staff_id}/{current_month}",
            200
        )
        
        if success and salary_data:
            print(f"   Salary Details:")
            print(f"   - Monthly Salary: ₹{salary_data.get('monthly_salary', 0)}")
            print(f"   - Daily Rate: ₹{salary_data.get('daily_rate', 0)}")
            print(f"   - Present Days: {salary_data.get('total_present', 0)}")
            print(f"   - Half Days: {salary_data.get('total_half_day', 0)}")
            print(f"   - Total Earned: ₹{salary_data.get('total_earned', 0)}")
        
        return success

    def test_whats_new_operations(self):
        """Test What's New functionality"""
        print("\n🆕 Testing What's New Operations...")
        
        # Test 1: Get What's New items (initially empty)
        success, items = self.run_test(
            "Get What's New Items",
            "GET",
            "whats-new",
            200
        )
        if not success:
            return False

        # Test 2: Create What's New item
        whats_new_data = {
            "version": "1.0.0",
            "title": "Test Feature",
            "description": "This is a test feature for API testing"
        }
        
        success, _ = self.run_test(
            "Create What's New Item",
            "POST",
            "whats-new",
            200,
            data=whats_new_data
        )
        
        return success

    def test_app_version(self):
        """Test app version endpoint"""
        print("\n📱 Testing App Version...")
        
        success, version_data = self.run_test(
            "Get App Version",
            "GET",
            "app-version",
            200
        )
        
        if success and version_data:
            print(f"   App Version: {version_data.get('version', 'Unknown')}")
        
        return success

    def cleanup(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        for staff_id in self.created_staff_ids:
            try:
                success, _ = self.run_test(
                    f"Delete Staff {staff_id}",
                    "DELETE",
                    f"staff/{staff_id}",
                    200
                )
                if success:
                    print(f"✅ Cleaned up staff {staff_id}")
            except Exception as e:
                print(f"❌ Failed to cleanup staff {staff_id}: {e}")

def main():
    print("🚀 Starting Staff Attendance & Salary Management API Tests")
    print("=" * 60)
    
    tester = StaffAttendanceAPITester()
    
    try:
        # Run all tests
        tests = [
            ("Root Endpoint", tester.test_root_endpoint),
            ("Staff CRUD Operations", tester.test_staff_crud),
            ("Attendance Operations", tester.test_attendance_operations),
            ("Salary Calculation", tester.test_salary_calculation),
            ("What's New Operations", tester.test_whats_new_operations),
            ("App Version", tester.test_app_version),
        ]
        
        all_passed = True
        for test_name, test_func in tests:
            print(f"\n{'='*20} {test_name} {'='*20}")
            result = test_func()
            if not result:
                all_passed = False
                print(f"❌ {test_name} failed!")
            else:
                print(f"✅ {test_name} passed!")
        
        # Print final results
        print(f"\n{'='*60}")
        print(f"📊 Final Results:")
        print(f"   Tests Run: {tester.tests_run}")
        print(f"   Tests Passed: {tester.tests_passed}")
        print(f"   Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
        
        if all_passed:
            print("🎉 All test suites passed!")
        else:
            print("❌ Some test suites failed!")
        
        return 0 if all_passed else 1
        
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        return 1
    
    finally:
        # Always cleanup
        tester.cleanup()

if __name__ == "__main__":
    sys.exit(main())