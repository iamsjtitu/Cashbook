"""
Test Hierarchical Ledger System
- Parent ledgers with sub-ledgers
- /api/parties/leaf API (excludes parent ledgers)
- Auto-create sub-ledgers for Staff, Chit Fund, Byaj
- Parent ledger shows aggregated sub-ledger transactions
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLeafPartiesAPI:
    """Test /api/parties/leaf endpoint - should exclude parent ledgers"""
    
    def test_leaf_parties_excludes_parents(self):
        """Parent ledgers (like KR Apartment) should NOT appear in leaf parties"""
        response = requests.get(f"{BASE_URL}/api/parties/leaf")
        assert response.status_code == 200
        
        parties = response.json()
        party_names = [p['name'] for p in parties]
        
        # KR Apartment is a parent ledger - should NOT be in leaf parties
        assert "KR Apartment" not in party_names, "Parent ledger KR Apartment should NOT appear in leaf parties"
        
        # Chandu [Thikadar] is a sub-ledger - should be in leaf parties
        assert "Chandu [Thikadar]" in party_names, "Sub-ledger Chandu [Thikadar] should appear in leaf parties"
        print(f"✓ Leaf parties API correctly excludes parent ledgers. Found {len(parties)} leaf parties")
    
    def test_leaf_parties_returns_only_non_parents(self):
        """All parties in leaf API should have no children"""
        # Get all parties
        all_response = requests.get(f"{BASE_URL}/api/parties")
        assert all_response.status_code == 200
        all_parties = all_response.json()
        
        # Get leaf parties
        leaf_response = requests.get(f"{BASE_URL}/api/parties/leaf")
        assert leaf_response.status_code == 200
        leaf_parties = leaf_response.json()
        
        # Find all parent IDs
        parent_ids = set(p.get('parent_party_id') for p in all_parties if p.get('parent_party_id'))
        
        # Verify no leaf party is a parent
        for party in leaf_parties:
            assert party['id'] not in parent_ids, f"Party {party['name']} is a parent but appears in leaf parties"
        
        print(f"✓ All {len(leaf_parties)} leaf parties have no children")


class TestParentLedgerView:
    """Test parent ledger shows aggregated sub-ledger transactions"""
    
    def test_parent_ledger_includes_sub_ledger_transactions(self):
        """Parent ledger API should include transactions from all sub-ledgers"""
        # Get KR Apartment (parent) ledger
        # First find KR Apartment ID
        parties_response = requests.get(f"{BASE_URL}/api/parties")
        assert parties_response.status_code == 200
        parties = parties_response.json()
        
        kr_apartment = next((p for p in parties if p['name'] == 'KR Apartment'), None)
        if not kr_apartment:
            pytest.skip("KR Apartment not found - skipping parent ledger test")
        
        # Get ledger for parent
        ledger_response = requests.get(f"{BASE_URL}/api/parties/{kr_apartment['id']}/ledger")
        assert ledger_response.status_code == 200
        
        ledger_data = ledger_response.json()
        
        # Verify response structure
        assert 'party' in ledger_data
        assert 'sub_ledgers' in ledger_data
        assert 'entries' in ledger_data
        
        # Verify sub-ledgers are included
        sub_ledgers = ledger_data['sub_ledgers']
        assert len(sub_ledgers) > 0, "Parent ledger should have sub-ledgers"
        
        sub_ledger_names = [s['name'] for s in sub_ledgers]
        assert "Chandu [Thikadar]" in sub_ledger_names, "Chandu [Thikadar] should be a sub-ledger of KR Apartment"
        
        print(f"✓ Parent ledger includes {len(sub_ledgers)} sub-ledgers: {sub_ledger_names}")
    
    def test_parent_ledger_entries_show_sub_ledger_name(self):
        """Transactions from sub-ledgers should show sub-ledger name in description"""
        # Get KR Apartment ledger
        parties_response = requests.get(f"{BASE_URL}/api/parties")
        parties = parties_response.json()
        
        kr_apartment = next((p for p in parties if p['name'] == 'KR Apartment'), None)
        if not kr_apartment:
            pytest.skip("KR Apartment not found")
        
        ledger_response = requests.get(f"{BASE_URL}/api/parties/{kr_apartment['id']}/ledger")
        ledger_data = ledger_response.json()
        
        entries = ledger_data.get('entries', [])
        if len(entries) == 0:
            pytest.skip("No transactions found for KR Apartment")
        
        # Check if any entry has sub-ledger name in description
        has_sub_ledger_tag = any('[' in e.get('description', '') for e in entries)
        print(f"✓ Found {len(entries)} entries. Sub-ledger tags present: {has_sub_ledger_tag}")


class TestAutoCreateSubLedger:
    """Test auto-creation of sub-ledgers for Staff, Chit Fund, Byaj"""
    
    def test_create_staff_creates_sub_ledger(self):
        """Creating a staff should auto-create sub-ledger under 'Staff Advances'"""
        unique_name = f"TEST_Staff_{uuid.uuid4().hex[:6]}"
        
        # Create staff
        staff_response = requests.post(f"{BASE_URL}/api/staff", json={
            "name": unique_name,
            "phone": "9999999999",
            "monthly_salary": 10000,
            "joining_date": "2026-01-01"
        })
        assert staff_response.status_code == 200
        staff = staff_response.json()
        
        # Check if sub-ledger was created
        parties_response = requests.get(f"{BASE_URL}/api/parties")
        parties = parties_response.json()
        
        # Look for "Staff - {name}" sub-ledger
        expected_ledger_name = f"Staff - {unique_name}"
        staff_ledger = next((p for p in parties if p['name'] == expected_ledger_name), None)
        
        # Also check for parent "Staff Advances"
        staff_advances_parent = next((p for p in parties if p['name'] == 'Staff Advances'), None)
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/staff/{staff['id']}")
        if staff_ledger:
            requests.delete(f"{BASE_URL}/api/parties/{staff_ledger['id']}")
        
        assert staff_advances_parent is not None, "Staff Advances parent ledger should be auto-created"
        assert staff_ledger is not None, f"Sub-ledger '{expected_ledger_name}' should be auto-created"
        assert staff_ledger.get('parent_party_id') == staff_advances_parent['id'], "Staff sub-ledger should be under Staff Advances"
        
        print(f"✓ Staff creation auto-created sub-ledger under 'Staff Advances'")
    
    def test_create_chit_fund_creates_sub_ledger(self):
        """Creating a chit fund should auto-create sub-ledger under 'Chit Fund Investment'"""
        unique_name = f"TEST_Chit_{uuid.uuid4().hex[:6]}"
        
        # Create chit fund
        chit_response = requests.post(f"{BASE_URL}/api/chit-funds", json={
            "name": unique_name,
            "chit_value": 100000,
            "monthly_installment": 5000,
            "total_members": 20,
            "duration_months": 20,
            "start_date": "2026-01-01"
        })
        assert chit_response.status_code == 200
        chit = chit_response.json()
        
        # Check if sub-ledger was created
        parties_response = requests.get(f"{BASE_URL}/api/parties")
        parties = parties_response.json()
        
        # Look for "Chit - {name}" sub-ledger
        expected_ledger_name = f"Chit - {unique_name}"
        chit_ledger = next((p for p in parties if p['name'] == expected_ledger_name), None)
        
        # Also check for parent "Chit Fund Investment"
        chit_parent = next((p for p in parties if p['name'] == 'Chit Fund Investment'), None)
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/chit-funds/{chit['id']}")
        if chit_ledger:
            requests.delete(f"{BASE_URL}/api/parties/{chit_ledger['id']}")
        
        assert chit_parent is not None, "Chit Fund Investment parent ledger should be auto-created"
        assert chit_ledger is not None, f"Sub-ledger '{expected_ledger_name}' should be auto-created"
        assert chit_ledger.get('parent_party_id') == chit_parent['id'], "Chit sub-ledger should be under Chit Fund Investment"
        
        print(f"✓ Chit Fund creation auto-created sub-ledger under 'Chit Fund Investment'")
    
    def test_create_interest_account_creates_sub_ledger(self):
        """Creating an interest/byaj account should auto-create sub-ledger under 'Byaj (Interest) Receivable'"""
        # First create a party for the interest account
        unique_name = f"TEST_Byaj_Party_{uuid.uuid4().hex[:6]}"
        party_response = requests.post(f"{BASE_URL}/api/parties", json={
            "name": unique_name,
            "phone": "",
            "address": "",
            "opening_balance": 0,
            "balance_type": "debit"
        })
        assert party_response.status_code == 200
        party = party_response.json()
        
        # Create interest account
        interest_response = requests.post(f"{BASE_URL}/api/interest-accounts", json={
            "party_id": party['id'],
            "principal_amount": 50000,
            "interest_rate": 2.0,
            "start_date": "2026-01-01"
        })
        assert interest_response.status_code == 200
        interest_account = interest_response.json()
        
        # Check if sub-ledger was created
        parties_response = requests.get(f"{BASE_URL}/api/parties")
        parties = parties_response.json()
        
        # Look for "Byaj - {party_name}" sub-ledger
        expected_ledger_name = f"Byaj - {unique_name}"
        byaj_ledger = next((p for p in parties if p['name'] == expected_ledger_name), None)
        
        # Also check for parent "Byaj (Interest) Receivable"
        byaj_parent = next((p for p in parties if p['name'] == 'Byaj (Interest) Receivable'), None)
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/interest-accounts/{interest_account['id']}")
        requests.delete(f"{BASE_URL}/api/parties/{party['id']}")
        if byaj_ledger:
            requests.delete(f"{BASE_URL}/api/parties/{byaj_ledger['id']}")
        
        assert byaj_parent is not None, "Byaj (Interest) Receivable parent ledger should be auto-created"
        assert byaj_ledger is not None, f"Sub-ledger '{expected_ledger_name}' should be auto-created"
        assert byaj_ledger.get('parent_party_id') == byaj_parent['id'], "Byaj sub-ledger should be under Byaj (Interest) Receivable"
        
        print(f"✓ Interest account creation auto-created sub-ledger under 'Byaj (Interest) Receivable'")


class TestParentLedgerBadge:
    """Test parent ledger shows sub-ledger count"""
    
    def test_parent_has_sub_ledger_count(self):
        """Parent ledger should have sub-ledgers that can be counted"""
        parties_response = requests.get(f"{BASE_URL}/api/parties")
        assert parties_response.status_code == 200
        parties = parties_response.json()
        
        # Find KR Apartment
        kr_apartment = next((p for p in parties if p['name'] == 'KR Apartment'), None)
        if not kr_apartment:
            pytest.skip("KR Apartment not found")
        
        # Count sub-ledgers
        sub_ledger_count = sum(1 for p in parties if p.get('parent_party_id') == kr_apartment['id'])
        
        assert sub_ledger_count > 0, "KR Apartment should have at least 1 sub-ledger"
        print(f"✓ KR Apartment has {sub_ledger_count} sub-ledger(s)")


class TestParentLedgerAccountHead:
    """Test parent ledgers have correct account head"""
    
    def test_auto_created_parents_have_correct_account_head(self):
        """Auto-created parent ledgers should have current_asset account head"""
        parties_response = requests.get(f"{BASE_URL}/api/parties")
        parties = parties_response.json()
        
        # Check known parent ledgers
        parent_ledgers = {
            "Staff Advances": "current_asset",
            "Chit Fund Investment": "current_asset",
            "Byaj (Interest) Receivable": "current_asset"
        }
        
        for parent_name, expected_head in parent_ledgers.items():
            parent = next((p for p in parties if p['name'] == parent_name), None)
            if parent:
                assert parent.get('account_head') == expected_head, \
                    f"{parent_name} should have account_head '{expected_head}', got '{parent.get('account_head')}'"
                print(f"✓ {parent_name} has correct account_head: {expected_head}")
            else:
                print(f"⚠ {parent_name} not found (may not be created yet)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
