from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import hashlib
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== AUTH MODELS ====================
class PasswordLogin(BaseModel):
    password: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class AppSettings(BaseModel):
    auto_refresh: bool = False
    refresh_interval: int = 30  # seconds

# ==================== AUTH APIs ====================
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@api_router.post("/auth/login")
async def login(data: PasswordLogin):
    """Login with password only"""
    settings = await db.app_settings.find_one({"key": "app_password"}, {"_id": 0})
    
    # Default password is "1234" if not set
    if not settings:
        default_hash = hash_password("1234")
        await db.app_settings.insert_one({"key": "app_password", "value": default_hash})
        settings = {"value": default_hash}
    
    if hash_password(data.password) == settings["value"]:
        return {"success": True, "message": "Login successful"}
    else:
        raise HTTPException(status_code=401, detail="Wrong password")

@api_router.post("/auth/change-password")
async def change_password(data: PasswordChange):
    """Change app password"""
    settings = await db.app_settings.find_one({"key": "app_password"}, {"_id": 0})
    
    # Check current password
    current_hash = hash_password(data.current_password)
    stored_hash = settings["value"] if settings else hash_password("1234")
    
    if current_hash != stored_hash:
        raise HTTPException(status_code=401, detail="Current password is wrong")
    
    # Update password
    new_hash = hash_password(data.new_password)
    await db.app_settings.update_one(
        {"key": "app_password"},
        {"$set": {"value": new_hash}},
        upsert=True
    )
    
    return {"success": True, "message": "Password changed successfully"}

@api_router.get("/settings/auto-refresh")
async def get_auto_refresh():
    """Get auto-refresh settings"""
    settings = await db.app_settings.find_one({"key": "auto_refresh"}, {"_id": 0})
    return {
        "enabled": settings.get("enabled", False) if settings else False,
        "interval": settings.get("interval", 30) if settings else 30
    }

@api_router.post("/settings/auto-refresh")
async def set_auto_refresh(enabled: bool, interval: int = 30):
    """Set auto-refresh settings"""
    await db.app_settings.update_one(
        {"key": "auto_refresh"},
        {"$set": {"key": "auto_refresh", "enabled": enabled, "interval": interval}},
        upsert=True
    )
    return {"success": True, "enabled": enabled, "interval": interval}

# Enums
class AttendanceStatus(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"
    HALF_DAY = "half_day"

# ==================== ACCOUNTING ENUMS ====================

# Main Account Types (5 Golden Rules)
class AccountType(str, Enum):
    ASSET = "asset"
    LIABILITY = "liability"
    CAPITAL = "capital"
    INCOME = "income"
    EXPENSE = "expense"

# Account Sub-Types
class AccountSubType(str, Enum):
    # Assets
    CURRENT_ASSET = "current_asset"       # Cash, Bank, Debtors, Stock
    FIXED_ASSET = "fixed_asset"           # Land, Building, Machinery, Furniture
    # Liabilities
    CURRENT_LIABILITY = "current_liability"  # Creditors, Short-term Loans
    LONG_TERM_LIABILITY = "long_term_liability"  # Bank Loans, Mortgages
    # Capital
    OWNERS_CAPITAL = "owners_capital"
    DRAWINGS = "drawings"
    RETAINED_EARNINGS = "retained_earnings"
    # Income
    DIRECT_INCOME = "direct_income"       # Sales
    INDIRECT_INCOME = "indirect_income"   # Interest Received, Commission
    # Expense
    DIRECT_EXPENSE = "direct_expense"     # Purchases, Wages
    INDIRECT_EXPENSE = "indirect_expense" # Salary, Rent, Electricity

# Financial Year Model
class FinancialYearBase(BaseModel):
    name: str  # e.g., "2025-26"
    start_date: str  # "2025-04-01"
    end_date: str  # "2026-03-31"
    is_active: bool = True

class FinancialYear(FinancialYearBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Chart of Accounts Model
class AccountBase(BaseModel):
    name: str
    account_type: AccountType
    sub_type: AccountSubType
    code: Optional[str] = None  # Account code like 1001, 2001
    description: Optional[str] = None
    opening_balance: float = 0.0
    opening_balance_type: str = "debit"  # debit or credit

class AccountCreate(AccountBase):
    pass

class Account(AccountBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    current_balance: float = 0.0
    is_active: bool = True
    is_system: bool = False  # System accounts can't be deleted
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

# Journal Entry (Double Entry) Model
class JournalEntryLine(BaseModel):
    account_id: str
    debit_amount: float = 0.0
    credit_amount: float = 0.0
    narration: Optional[str] = None

class JournalEntryBase(BaseModel):
    date: str  # YYYY-MM-DD
    voucher_type: str  # payment, receipt, journal, contra, sales, purchase
    voucher_no: Optional[str] = None
    narration: str
    entries: List[JournalEntryLine]
    payment_mode: Optional[str] = None
    reference: Optional[str] = None

class JournalEntryCreate(JournalEntryBase):
    pass

class JournalEntry(JournalEntryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    financial_year: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Opening Balance Model
class OpeningBalanceBase(BaseModel):
    account_id: str
    financial_year: str
    amount: float
    balance_type: str  # debit or credit

class OpeningBalanceCreate(OpeningBalanceBase):
    pass

class OpeningBalance(OpeningBalanceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Models
class StaffBase(BaseModel):
    name: str
    joining_date: str
    monthly_salary: float
    phone: Optional[str] = None  # Optional field

class StaffCreate(StaffBase):
    pass

class Staff(StaffBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    joining_date: Optional[str] = None
    monthly_salary: Optional[float] = None

class AttendanceBase(BaseModel):
    staff_id: str
    date: str  # YYYY-MM-DD
    status: AttendanceStatus

class AttendanceCreate(AttendanceBase):
    pass

class Attendance(AttendanceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SalaryCalculation(BaseModel):
    staff_id: str
    staff_name: str
    month: str  # YYYY-MM
    monthly_salary: float
    daily_rate: float
    total_present: int
    total_absent: int
    total_half_day: int
    total_working_days: int
    present_amount: float
    half_day_amount: float
    total_earned: float
    total_deducted: float

class WhatsNewItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    version: str
    title: str
    description: str
    date: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d"))

class WhatsNewCreate(BaseModel):
    version: str
    title: str
    description: str

class AppVersion(BaseModel):
    version: str
    download_url: str
    release_notes: str
    release_date: str

# Advance Models
class AdvanceBase(BaseModel):
    staff_id: str
    amount: float
    date: str  # YYYY-MM-DD
    note: Optional[str] = None

class AdvanceCreate(AdvanceBase):
    pass

class Advance(AdvanceBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Advance Summary for Monthly Report
class AdvanceSummary(BaseModel):
    staff_id: str
    staff_name: str
    total_advance: float
    advance_count: int

# ==================== ACCOUNTING MODELS ====================

# Payment Mode Enum
class PaymentMode(str, Enum):
    CASH = "cash"
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"

# Transaction Type Enum
class TransactionType(str, Enum):
    CREDIT = "credit"  # Money received (Jama)
    DEBIT = "debit"    # Money paid (Udhar)

# Expense Category Enum
class ExpenseCategory(str, Enum):
    SALARY = "salary"
    ADVANCE = "advance"
    RENT = "rent"
    ELECTRICITY = "electricity"
    SUPPLIES = "supplies"
    MAINTENANCE = "maintenance"
    TRANSPORT = "transport"
    FOOD = "food"
    INTEREST_PAID = "interest_paid"
    CHIT_FUND = "chit_fund"
    OTHER = "other"

# Account Head Types for hierarchy
class AccountHeadType(str, Enum):
    # Balance Sheet Items
    CURRENT_ASSET = "current_asset"
    FIXED_ASSET = "fixed_asset"
    CURRENT_LIABILITY = "current_liability"
    LONG_TERM_LIABILITY = "long_term_liability"
    CAPITAL = "capital"
    # P&L Items
    DIRECT_INCOME = "direct_income"
    INDIRECT_INCOME = "indirect_income"
    DIRECT_EXPENSE = "direct_expense"
    INDIRECT_EXPENSE = "indirect_expense"

# Party (Ledger Account) Models
class PartyBase(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    opening_balance: float = 0.0
    balance_type: TransactionType = TransactionType.DEBIT  # debit = we owe them, credit = they owe us
    account_head: Optional[AccountHeadType] = None  # Category HEAD
    parent_party_id: Optional[str] = None  # Parent ledger (for sub-ledgers)

class PartyCreate(PartyBase):
    pass

class Party(PartyBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    current_balance: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PartyUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    opening_balance: Optional[float] = None
    balance_type: Optional[TransactionType] = None
    account_head: Optional[AccountHeadType] = None
    parent_party_id: Optional[str] = None

# Interest/Byaj Models
class InterestAccountBase(BaseModel):
    party_id: str
    principal_amount: float
    interest_rate: float  # Annual percentage
    start_date: str  # YYYY-MM-DD
    note: Optional[str] = None

class InterestAccountCreate(InterestAccountBase):
    pass

class InterestAccount(InterestAccountBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    total_interest_added: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InterestCalculation(BaseModel):
    account_id: str
    party_name: str
    principal: float
    interest_rate: float  # Monthly rate
    days: int
    months: float  # Days / 30 (always 30-day month)
    calculated_interest: float
    total_amount: float

# Transaction (Cash Book Entry) Models
class TransactionBase(BaseModel):
    date: str  # YYYY-MM-DD
    party_id: Optional[str] = None
    transaction_type: TransactionType
    amount: float
    payment_mode: PaymentMode
    description: str
    category: Optional[ExpenseCategory] = None
    reference_id: Optional[str] = None  # For auto-linked entries (salary_id, advance_id, interest_id)
    reference_type: Optional[str] = None  # salary, advance, interest, manual

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Expense Models (for quick expense entry)
class ExpenseBase(BaseModel):
    date: str
    category: ExpenseCategory
    amount: float
    payment_mode: PaymentMode
    description: str
    party_id: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_id: Optional[str] = None  # Link to cash book
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Cash Book Summary
class CashBookSummary(BaseModel):
    date: str
    opening_balance: float
    total_credit: float
    total_debit: float
    closing_balance: float
    transactions: List[Transaction]

# Daily Summary for Reports
class DailySummary(BaseModel):
    date: str
    cash_in: float
    cash_out: float
    upi_in: float
    upi_out: float
    bank_in: float
    bank_out: float
    net_balance: float

# Party Ledger Entry
class LedgerEntry(BaseModel):
    date: str
    description: str
    debit: float
    credit: float
    balance: float
    payment_mode: PaymentMode
    transaction_id: str

# Chit Fund Models - Single User Tracking
class ChitFundBase(BaseModel):
    name: str  # Chit fund name (e.g., "XYZ Chit Fund")
    chit_value: float  # Total chit value (e.g., 10,00,000)
    monthly_installment: float  # User's monthly EMI (e.g., 50,000)
    total_members: int  # Number of members (e.g., 20)
    duration_months: int  # Total months (usually = total_members)
    start_date: str  # YYYY-MM-DD
    organizer: Optional[str] = None  # Chit company name
    note: Optional[str] = None
    # Opening balance - for installments already paid before using this software
    opening_installments_paid: int = 0  # Kitne installment pehle se paid hain
    opening_amount_paid: float = 0.0  # Pehle se kitna paisa diya hua hai

class ChitFundCreate(ChitFundBase):
    pass

class ChitFund(ChitFundBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    # Lifted (Uthaya) tracking
    is_lifted: bool = False  # Did user lift/win this chit?
    lifted_month: Optional[int] = None  # Which month user lifted
    lifted_amount: Optional[float] = None  # Amount received when lifted
    # Totals (auto-calculated from entries, does NOT include opening)
    total_paid: float = 0.0  # Sum of all EMIs paid via entries
    total_dividend: float = 0.0  # Sum of all monthly dividends
    payments_count: int = 0  # Number of months paid via entries
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChitFundUpdate(BaseModel):
    name: Optional[str] = None
    organizer: Optional[str] = None
    note: Optional[str] = None
    is_active: Optional[bool] = None
    opening_installments_paid: Optional[int] = None
    opening_amount_paid: Optional[float] = None

# Chit Fund Monthly Entry - Track each month's payment and dividend
class ChitMonthlyEntryBase(BaseModel):
    chit_id: str
    month_number: int  # Which month (1, 2, 3...)
    payment_date: str  # YYYY-MM-DD
    paid_amount: float  # EMI paid this month
    dividend_received: float  # Is mahine kitna mila (dividend)
    payment_mode: PaymentMode
    note: Optional[str] = None

class ChitMonthlyEntryCreate(ChitMonthlyEntryBase):
    pass

class ChitMonthlyEntry(ChitMonthlyEntryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # Calculated field
    effective_cost: float = 0.0  # paid_amount - dividend_received
    transaction_id: Optional[str] = None  # Link to cash book (for EMI payment)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== HELPER FUNCTIONS FOR AUTO-LINKING ====================

async def get_or_create_parent_ledger(name: str, account_head: str) -> str:
    """Get or create a parent ledger for auto-linking modules like Chit Fund, Staff Advance, etc."""
    existing = await db.parties.find_one({"name": name, "account_head": account_head}, {"_id": 0})
    if existing:
        return existing["id"]
    
    # Create new parent ledger
    party_id = str(uuid.uuid4())
    party_doc = {
        "id": party_id,
        "name": name,
        "phone": None,
        "address": None,
        "opening_balance": 0.0,
        "balance_type": "debit",
        "account_head": account_head,
        "parent_party_id": None,
        "current_balance": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.parties.insert_one(party_doc)
    return party_id

async def get_or_create_sub_ledger(name: str, parent_name: str, parent_account_head: str) -> str:
    """Get or create a sub-ledger under a parent ledger"""
    # First ensure parent exists
    parent_id = await get_or_create_parent_ledger(parent_name, parent_account_head)
    
    # Check if sub-ledger exists
    existing = await db.parties.find_one({"name": name, "parent_party_id": parent_id}, {"_id": 0})
    if existing:
        return existing["id"]
    
    # Create new sub-ledger
    party_id = str(uuid.uuid4())
    party_doc = {
        "id": party_id,
        "name": name,
        "phone": None,
        "address": None,
        "opening_balance": 0.0,
        "balance_type": "debit",
        "account_head": None,  # Sub-ledger inherits parent's account head
        "parent_party_id": parent_id,
        "current_balance": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.parties.insert_one(party_doc)
    return party_id

async def update_party_balance(party_id: str, amount: float, is_debit: bool):
    """Update party balance and also update parent's aggregated balance"""
    party = await db.parties.find_one({"id": party_id}, {"_id": 0})
    if not party:
        return
    
    # Update this party's balance
    current = party.get("current_balance", 0)
    if is_debit:
        new_balance = current + amount
    else:
        new_balance = current - amount
    
    await db.parties.update_one({"id": party_id}, {"$set": {"current_balance": new_balance}})
    
    # If this party has a parent, update parent's aggregated view (no direct balance change needed
    # as parent ledger shows sum of all sub-ledgers when viewed)

# Staff APIs
@api_router.post("/staff", response_model=Staff)
async def create_staff(staff: StaffCreate):
    staff_obj = Staff(**staff.model_dump())
    doc = staff_obj.model_dump()
    await db.staff.insert_one(doc)
    
    # Auto-create sub-ledger for staff under "Staff Advances" parent
    await get_or_create_sub_ledger(
        name=f"Staff - {staff.name}",
        parent_name="Staff Advances",
        parent_account_head="current_asset"
    )
    
    return staff_obj

@api_router.get("/staff", response_model=List[Staff])
async def get_all_staff():
    staff_list = await db.staff.find({}, {"_id": 0}).to_list(1000)
    return staff_list

@api_router.get("/staff/{staff_id}", response_model=Staff)
async def get_staff(staff_id: str):
    staff = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return staff

@api_router.put("/staff/{staff_id}", response_model=Staff)
async def update_staff(staff_id: str, staff_update: StaffUpdate):
    update_data = {k: v for k, v in staff_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.staff.update_one({"id": staff_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    updated_staff = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    return updated_staff

@api_router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str):
    result = await db.staff.delete_one({"id": staff_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    # Also delete all attendance records
    await db.attendance.delete_many({"staff_id": staff_id})
    return {"message": "Staff deleted successfully"}

# Attendance APIs
@api_router.post("/attendance", response_model=Attendance)
async def mark_attendance(attendance: AttendanceCreate):
    # Check if attendance already exists for this date and staff
    existing = await db.attendance.find_one({
        "staff_id": attendance.staff_id,
        "date": attendance.date
    })
    
    if existing:
        # Update existing attendance
        await db.attendance.update_one(
            {"staff_id": attendance.staff_id, "date": attendance.date},
            {"$set": {"status": attendance.status}}
        )
        updated = await db.attendance.find_one(
            {"staff_id": attendance.staff_id, "date": attendance.date},
            {"_id": 0}
        )
        return updated
    
    attendance_obj = Attendance(**attendance.model_dump())
    doc = attendance_obj.model_dump()
    await db.attendance.insert_one(doc)
    return attendance_obj

@api_router.get("/attendance/{staff_id}/{month}", response_model=List[Attendance])
async def get_staff_attendance(staff_id: str, month: str):
    # month format: YYYY-MM
    attendance_list = await db.attendance.find({
        "staff_id": staff_id,
        "date": {"$regex": f"^{month}"}
    }, {"_id": 0}).to_list(1000)
    return attendance_list

@api_router.get("/attendance/date/{date}", response_model=List[Attendance])
async def get_attendance_by_date(date: str):
    # date format: YYYY-MM-DD
    attendance_list = await db.attendance.find({
        "date": date
    }, {"_id": 0}).to_list(1000)
    return attendance_list

@api_router.delete("/attendance/{staff_id}/{date}")
async def delete_attendance(staff_id: str, date: str):
    result = await db.attendance.delete_one({
        "staff_id": staff_id,
        "date": date
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return {"message": "Attendance deleted successfully"}

# Salary Payments API - MUST be before /salary/{staff_id}/{month} to avoid route conflict
@api_router.get("/salary/payments/{month}")
async def get_salary_payments(month: str):
    """Get all salary payments for a month"""
    payments = await db.salary_payments.find({"month": month}, {"_id": 0}).to_list(1000)
    return payments

# Salary Calculation API
@api_router.get("/salary/{staff_id}/{month}", response_model=SalaryCalculation)
async def calculate_salary(staff_id: str, month: str):
    # Get staff info
    staff = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Get attendance for the month
    attendance_list = await db.attendance.find({
        "staff_id": staff_id,
        "date": {"$regex": f"^{month}"}
    }, {"_id": 0}).to_list(100)
    
    monthly_salary = staff["monthly_salary"]
    # Always calculate daily rate based on 30 days
    daily_rate = monthly_salary / 30
    
    present_count = sum(1 for a in attendance_list if a["status"] == "present")
    absent_count = sum(1 for a in attendance_list if a["status"] == "absent")
    half_day_count = sum(1 for a in attendance_list if a["status"] == "half_day")
    
    total_working_days = present_count + absent_count + half_day_count
    
    present_amount = present_count * daily_rate
    half_day_amount = half_day_count * (daily_rate / 2)
    total_earned = present_amount + half_day_amount
    total_deducted = (absent_count * daily_rate) + (half_day_count * (daily_rate / 2))
    
    return SalaryCalculation(
        staff_id=staff_id,
        staff_name=staff["name"],
        month=month,
        monthly_salary=monthly_salary,
        daily_rate=round(daily_rate, 2),
        total_present=present_count,
        total_absent=absent_count,
        total_half_day=half_day_count,
        total_working_days=total_working_days,
        present_amount=round(present_amount, 2),
        half_day_amount=round(half_day_amount, 2),
        total_earned=round(total_earned, 2),
        total_deducted=round(total_deducted, 2)
    )

# What's New APIs
@api_router.post("/whats-new", response_model=WhatsNewItem)
async def create_whats_new(item: WhatsNewCreate):
    whats_new_obj = WhatsNewItem(**item.model_dump())
    doc = whats_new_obj.model_dump()
    await db.whats_new.insert_one(doc)
    return whats_new_obj

@api_router.get("/whats-new", response_model=List[WhatsNewItem])
async def get_whats_new():
    items = await db.whats_new.find({}, {"_id": 0}).sort("date", -1).to_list(100)
    return items

# App Version API (for auto-update)
@api_router.get("/app-version", response_model=AppVersion)
async def get_app_version():
    # This would be updated when a new release is made
    version = await db.app_version.find_one({}, {"_id": 0})
    if not version:
        return AppVersion(
            version="1.0.0",
            download_url="",
            release_notes="Initial release",
            release_date=datetime.now(timezone.utc).strftime("%Y-%m-%d")
        )
    return version

@api_router.post("/app-version", response_model=AppVersion)
async def update_app_version(version: AppVersion):
    await db.app_version.delete_many({})
    await db.app_version.insert_one(version.model_dump())
    return version

# Advance APIs - Auto-link to Cash Book
@api_router.post("/advances", response_model=Advance)
async def create_advance(advance: AdvanceCreate):
    # Verify staff exists
    staff = await db.staff.find_one({"id": advance.staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    advance_obj = Advance(**advance.model_dump())
    doc = advance_obj.model_dump()
    await db.advances.insert_one(doc)
    
    # Auto-create Cash Book entry (Debit - advance given to staff)
    txn = Transaction(
        date=advance.date,
        transaction_type=TransactionType.DEBIT,
        amount=advance.amount,
        payment_mode=PaymentMode.CASH,
        description=f"Advance: {staff['name']} - {advance.note or 'Advance Payment'}",
        category=ExpenseCategory.SALARY,
        reference_id=advance_obj.id,
        reference_type="advance"
    )
    await db.transactions.insert_one(txn.model_dump())
    
    return advance_obj

@api_router.get("/advances", response_model=List[Advance])
async def get_all_advances():
    advances = await db.advances.find({}, {"_id": 0}).sort("date", -1).to_list(1000)
    return advances

@api_router.get("/advances/{staff_id}", response_model=List[Advance])
async def get_staff_advances(staff_id: str):
    advances = await db.advances.find({"staff_id": staff_id}, {"_id": 0}).sort("date", -1).to_list(1000)
    return advances

@api_router.get("/advances/month/{month}", response_model=List[Advance])
async def get_advances_by_month(month: str):
    # month format: YYYY-MM
    advances = await db.advances.find({
        "date": {"$regex": f"^{month}"}
    }, {"_id": 0}).sort("date", -1).to_list(1000)
    return advances

@api_router.delete("/advances/{advance_id}")
async def delete_advance(advance_id: str):
    result = await db.advances.delete_one({"id": advance_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Advance not found")
    return {"message": "Advance deleted successfully"}

@api_router.get("/advances/summary/{month}", response_model=List[AdvanceSummary])
async def get_advance_summary(month: str):
    # Get all staff
    staff_list = await db.staff.find({}, {"_id": 0}).to_list(1000)
    
    # Get advances for the month
    advances = await db.advances.find({
        "date": {"$regex": f"^{month}"}
    }, {"_id": 0}).to_list(1000)
    
    summaries = []
    for staff in staff_list:
        staff_advances = [a for a in advances if a["staff_id"] == staff["id"]]
        total = sum(a["amount"] for a in staff_advances)
        summaries.append(AdvanceSummary(
            staff_id=staff["id"],
            staff_name=staff["name"],
            total_advance=total,
            advance_count=len(staff_advances)
        ))
    
    return summaries

# Salary Payment API - Auto-link to Cash Book
class SalaryPaymentRequest(BaseModel):
    staff_id: str
    month: str  # YYYY-MM
    amount: float
    payment_date: str  # YYYY-MM-DD
    payment_mode: PaymentMode = PaymentMode.CASH
    advance_deducted: float = 0.0
    note: Optional[str] = None

@api_router.post("/salary/pay")
async def pay_salary(payment: SalaryPaymentRequest):
    """Pay salary to staff and auto-create Cash Book entry"""
    staff = await db.staff.find_one({"id": payment.staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Create salary payment record
    salary_record = {
        "id": str(uuid.uuid4()),
        "staff_id": payment.staff_id,
        "staff_name": staff["name"],
        "month": payment.month,
        "amount": payment.amount,
        "advance_deducted": payment.advance_deducted,
        "net_paid": payment.amount - payment.advance_deducted,
        "payment_date": payment.payment_date,
        "payment_mode": payment.payment_mode,
        "note": payment.note,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.salary_payments.insert_one(salary_record)
    
    # Auto-create Cash Book entry (Debit - salary paid)
    net_amount = payment.amount - payment.advance_deducted
    if net_amount > 0:
        txn = Transaction(
            date=payment.payment_date,
            transaction_type=TransactionType.DEBIT,
            amount=net_amount,
            payment_mode=payment.payment_mode,
            description=f"Salary: {staff['name']} - {payment.month}" + (f" (Advance ₹{payment.advance_deducted} deducted)" if payment.advance_deducted > 0 else ""),
            category=ExpenseCategory.SALARY,
            reference_id=salary_record["id"],
            reference_type="salary_payment"
        )
        await db.transactions.insert_one(txn.model_dump())
    
    return {
        "message": "Salary paid successfully",
        "staff_name": staff["name"],
        "month": payment.month,
        "gross_amount": payment.amount,
        "advance_deducted": payment.advance_deducted,
        "net_paid": net_amount,
        "transaction_created": net_amount > 0
    }

# Root API
@api_router.get("/")
async def root():
    return {"message": "Staff Attendance & Salary Management API"}

# ==================== ACCOUNTING APIs ====================

# Party (Ledger) APIs
@api_router.post("/parties", response_model=Party)
async def create_party(party: PartyCreate):
    party_obj = Party(**party.model_dump())
    party_obj.current_balance = party.opening_balance
    doc = party_obj.model_dump()
    await db.parties.insert_one(doc)
    return party_obj

@api_router.get("/parties", response_model=List[Party])
async def get_all_parties():
    parties = await db.parties.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return parties

# Get parties grouped by account head - MUST be before /parties/{party_id} to avoid route conflict
@api_router.get("/parties/grouped")
async def get_parties_grouped():
    """Get all parties grouped by account head for reports"""
    parties = await db.parties.find({}, {"_id": 0}).to_list(10000)
    
    grouped = {
        "current_asset": [],
        "fixed_asset": [],
        "current_liability": [],
        "long_term_liability": [],
        "capital": [],
        "direct_income": [],
        "indirect_income": [],
        "direct_expense": [],
        "indirect_expense": [],
        "uncategorized": []
    }
    
    for party in parties:
        head = party.get("account_head") or "uncategorized"
        if head in grouped:
            grouped[head].append(party)
        else:
            grouped["uncategorized"].append(party)
    
    return grouped

# Get only leaf parties (no sub-ledgers under them) for transaction dropdowns
# MUST be before /parties/{party_id} to avoid route conflict
@api_router.get("/parties/leaf")
async def get_leaf_parties():
    """Get parties that don't have any sub-ledgers - for transaction entry"""
    all_parties = await db.parties.find({}, {"_id": 0}).to_list(10000)
    
    # Find all parent_party_ids that have children
    parent_ids_with_children = set()
    for party in all_parties:
        if party.get("parent_party_id"):
            parent_ids_with_children.add(party["parent_party_id"])
    
    # Return only parties that are NOT parents (leaf nodes)
    leaf_parties = [p for p in all_parties if p["id"] not in parent_ids_with_children]
    return leaf_parties

@api_router.get("/parties/{party_id}", response_model=Party)
async def get_party(party_id: str):
    party = await db.parties.find_one({"id": party_id}, {"_id": 0})
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    return party

@api_router.put("/parties/{party_id}", response_model=Party)
async def update_party(party_id: str, party_update: PartyUpdate):
    update_data = {k: v for k, v in party_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    # If opening_balance is being updated, recalculate current_balance
    if "opening_balance" in update_data:
        party = await db.parties.find_one({"id": party_id}, {"_id": 0})
        if party:
            old_opening = party.get("opening_balance", 0)
            new_opening = update_data["opening_balance"]
            diff = new_opening - old_opening
            update_data["current_balance"] = party.get("current_balance", 0) + diff
    
    result = await db.parties.update_one({"id": party_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Party not found")
    
    updated = await db.parties.find_one({"id": party_id}, {"_id": 0})
    return updated

@api_router.delete("/parties/{party_id}")
async def delete_party(party_id: str):
    # Check if party has transactions
    txn_count = await db.transactions.count_documents({"party_id": party_id})
    if txn_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete party with {txn_count} transactions")
    
    # Check if party has sub-parties
    sub_count = await db.parties.count_documents({"parent_party_id": party_id})
    if sub_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete party with {sub_count} sub-ledgers")
    
    result = await db.parties.delete_one({"id": party_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Party not found")
    return {"message": "Party deleted successfully"}

# Account Head Types API
@api_router.get("/account-heads")
async def get_account_heads():
    """Get all account head types for categorization"""
    return {
        "balance_sheet": [
            {"value": "current_asset", "label": "Current Asset (चालू संपत्ति)", "type": "asset"},
            {"value": "fixed_asset", "label": "Fixed Asset (स्थायी संपत्ति)", "type": "asset"},
            {"value": "current_liability", "label": "Current Liability (चालू देनदारी)", "type": "liability"},
            {"value": "long_term_liability", "label": "Long Term Liability (दीर्घकालिक देनदारी)", "type": "liability"},
            {"value": "capital", "label": "Capital (पूंजी)", "type": "capital"}
        ],
        "profit_loss": [
            {"value": "direct_income", "label": "Direct Income (प्रत्यक्ष आय)", "type": "income"},
            {"value": "indirect_income", "label": "Indirect Income (अप्रत्यक्ष आय)", "type": "income"},
            {"value": "direct_expense", "label": "Direct Expense (प्रत्यक्ष खर्च)", "type": "expense"},
            {"value": "indirect_expense", "label": "Indirect Expense (अप्रत्यक्ष खर्च)", "type": "expense"}
        ]
    }

# Party Ledger API - Shows transactions including sub-ledgers
@api_router.get("/parties/{party_id}/ledger")
async def get_party_ledger(party_id: str):
    party = await db.parties.find_one({"id": party_id}, {"_id": 0})
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    
    # Get all party IDs to include (this party + all sub-ledgers)
    party_ids = [party_id]
    sub_parties = await db.parties.find({"parent_party_id": party_id}, {"_id": 0}).to_list(1000)
    for sub in sub_parties:
        party_ids.append(sub["id"])
    
    # Get transactions for this party and all sub-ledgers
    transactions = await db.transactions.find(
        {"party_id": {"$in": party_ids}}, {"_id": 0}
    ).sort("date", 1).to_list(10000)
    
    ledger_entries = []
    running_balance = party.get("opening_balance", 0)
    
    # Add opening balances from sub-ledgers
    for sub in sub_parties:
        running_balance += sub.get("opening_balance", 0)
    
    for txn in transactions:
        # Get sub-ledger name if transaction is from sub-ledger
        txn_party_name = ""
        if txn["party_id"] != party_id:
            sub_party = next((s for s in sub_parties if s["id"] == txn["party_id"]), None)
            if sub_party:
                txn_party_name = f" [{sub_party['name']}]"
        
        if txn["transaction_type"] == "debit":
            running_balance += txn["amount"]
            ledger_entries.append(LedgerEntry(
                date=txn["date"],
                description=txn["description"] + txn_party_name,
                debit=txn["amount"],
                credit=0,
                balance=running_balance,
                payment_mode=txn["payment_mode"],
                transaction_id=txn["id"]
            ))
        else:
            running_balance -= txn["amount"]
            ledger_entries.append(LedgerEntry(
                date=txn["date"],
                description=txn["description"] + txn_party_name,
                debit=0,
                credit=txn["amount"],
                balance=running_balance,
                payment_mode=txn["payment_mode"],
                transaction_id=txn["id"]
            ))
    
    return {
        "party": party,
        "sub_ledgers": sub_parties,
        "opening_balance": party.get("opening_balance", 0),
        "current_balance": running_balance,
        "entries": [e.model_dump() for e in ledger_entries]
    }

# Interest/Byaj APIs
@api_router.post("/interest-accounts", response_model=InterestAccount)
async def create_interest_account(account: InterestAccountCreate):
    # Verify party exists
    party = await db.parties.find_one({"id": account.party_id}, {"_id": 0})
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    
    account_obj = InterestAccount(**account.model_dump())
    doc = account_obj.model_dump()
    await db.interest_accounts.insert_one(doc)
    
    # Auto-create sub-ledger for interest account under "Byaj (Interest) Receivable" parent
    party_name = party.get("name", "Unknown")
    await get_or_create_sub_ledger(
        name=f"Byaj - {party_name}",
        parent_name="Byaj (Interest) Receivable",
        parent_account_head="current_asset"
    )
    
    return account_obj

@api_router.get("/interest-accounts", response_model=List[InterestAccount])
async def get_all_interest_accounts():
    accounts = await db.interest_accounts.find({}, {"_id": 0}).to_list(1000)
    return accounts

@api_router.get("/interest-accounts/{account_id}", response_model=InterestAccount)
async def get_interest_account(account_id: str):
    account = await db.interest_accounts.find_one({"id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Interest account not found")
    return account

@api_router.get("/interest-accounts/{account_id}/calculate")
async def calculate_interest(account_id: str, end_date: Optional[str] = None):
    account = await db.interest_accounts.find_one({"id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Interest account not found")
    
    party = await db.parties.find_one({"id": account["party_id"]}, {"_id": 0})
    
    # Calculate days
    start = datetime.strptime(account["start_date"], "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d") if end_date else datetime.now(timezone.utc)
    days = (end - start).days
    
    if days < 0:
        days = 0
    
    # MONTHLY INTEREST CALCULATION (30-day basis)
    # 1 month = 30 days (always, regardless of actual month days)
    # Formula: Principal × Monthly Rate × Months / 100
    # Where Months = Days / 30
    principal = account["principal_amount"]
    rate = account["interest_rate"]  # This is MONTHLY rate
    months = days / 30  # Always 30-day month basis
    interest = (principal * rate * months) / 100
    
    return InterestCalculation(
        account_id=account_id,
        party_name=party["name"] if party else "Unknown",
        principal=principal,
        interest_rate=rate,
        days=days,
        months=round(months, 2),
        calculated_interest=round(interest, 2),
        total_amount=round(principal + interest, 2)
    )

@api_router.post("/interest-accounts/{account_id}/add-to-cashbook")
async def add_interest_to_cashbook(account_id: str, end_date: Optional[str] = None):
    """Add calculated interest to cash book and party ledger (30-day monthly basis)"""
    account = await db.interest_accounts.find_one({"id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Interest account not found")
    
    party = await db.parties.find_one({"id": account["party_id"]}, {"_id": 0})
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    
    # Calculate interest (30-day monthly basis)
    start = datetime.strptime(account["start_date"], "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d") if end_date else datetime.now()
    days = max(0, (end - start).days)
    
    principal = account["principal_amount"]
    rate = account["interest_rate"]  # Monthly rate
    months = days / 30  # Always 30-day month
    interest = round((principal * rate * months) / 100, 2)
    
    if interest <= 0:
        raise HTTPException(status_code=400, detail="No interest to add")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Create transaction in cash book
    txn = Transaction(
        date=today,
        party_id=account["party_id"],
        transaction_type=TransactionType.DEBIT,
        amount=interest,
        payment_mode=PaymentMode.CASH,
        description=f"Byaj @ {rate}%/month for {round(months, 2)} months ({days} days) on ₹{principal}",
        category=ExpenseCategory.INTEREST_PAID,
        reference_id=account_id,
        reference_type="interest"
    )
    await db.transactions.insert_one(txn.model_dump())
    
    # Update party balance
    new_balance = party.get("current_balance", 0) + interest
    await db.parties.update_one(
        {"id": account["party_id"]},
        {"$set": {"current_balance": new_balance}}
    )
    
    # Update interest account
    total_added = account.get("total_interest_added", 0) + interest
    new_start = end.strftime("%Y-%m-%d") if end_date else today
    await db.interest_accounts.update_one(
        {"id": account_id},
        {"$set": {"total_interest_added": total_added, "start_date": new_start}}
    )
    
    return {
        "message": "Interest added to cash book",
        "interest_amount": interest,
        "party_name": party["name"],
        "new_balance": new_balance,
        "transaction_id": txn.id
    }

@api_router.delete("/interest-accounts/{account_id}")
async def delete_interest_account(account_id: str):
    result = await db.interest_accounts.delete_one({"id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Interest account not found")
    return {"message": "Interest account deleted"}

# Transaction (Cash Book) APIs
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(txn: TransactionCreate):
    txn_obj = Transaction(**txn.model_dump())
    doc = txn_obj.model_dump()
    await db.transactions.insert_one(doc)
    
    # Update party balance if party_id exists
    if txn.party_id:
        party = await db.parties.find_one({"id": txn.party_id}, {"_id": 0})
        if party:
            current = party.get("current_balance", 0)
            if txn.transaction_type == TransactionType.DEBIT:
                new_balance = current + txn.amount
            else:
                new_balance = current - txn.amount
            await db.parties.update_one(
                {"id": txn.party_id},
                {"$set": {"current_balance": new_balance}}
            )
    
    return txn_obj

@api_router.get("/transactions", response_model=List[Transaction])
async def get_all_transactions(date: Optional[str] = None, month: Optional[str] = None):
    query = {}
    if date:
        query["date"] = date
    elif month:
        query["date"] = {"$regex": f"^{month}"}
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    return transactions

@api_router.get("/transactions/{txn_id}", response_model=Transaction)
async def get_transaction(txn_id: str):
    txn = await db.transactions.find_one({"id": txn_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn

@api_router.delete("/transactions/{txn_id}")
async def delete_transaction(txn_id: str):
    txn = await db.transactions.find_one({"id": txn_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Reverse party balance
    if txn.get("party_id"):
        party = await db.parties.find_one({"id": txn["party_id"]}, {"_id": 0})
        if party:
            current = party.get("current_balance", 0)
            if txn["transaction_type"] == "debit":
                new_balance = current - txn["amount"]
            else:
                new_balance = current + txn["amount"]
            await db.parties.update_one(
                {"id": txn["party_id"]},
                {"$set": {"current_balance": new_balance}}
            )
    
    await db.transactions.delete_one({"id": txn_id})
    return {"message": "Transaction deleted"}

# Cash Book Opening Balance APIs (MUST be before /cashbook/{date} to avoid route conflict)
@api_router.get("/cashbook/opening-balance")
async def get_cashbook_opening_balance():
    """Get cash book opening balance"""
    setting = await db.settings.find_one({"key": "cash_opening_balance"}, {"_id": 0})
    return {
        "opening_balance": setting.get("value", 0) if setting else 0,
        "as_on_date": setting.get("as_on_date", "2025-04-01") if setting else "2025-04-01"
    }

@api_router.post("/cashbook/opening-balance")
async def set_cashbook_opening_balance(amount: float, as_on_date: str = "2025-04-01"):
    """Set cash book opening balance (for Financial Year start)"""
    await db.settings.update_one(
        {"key": "cash_opening_balance"},
        {"$set": {"key": "cash_opening_balance", "value": amount, "as_on_date": as_on_date}},
        upsert=True
    )
    return {"message": "Opening balance set", "opening_balance": amount, "as_on_date": as_on_date}

# Cash Book API
@api_router.get("/cashbook/{date}")
async def get_cashbook(date: str):
    transactions = await db.transactions.find(
        {"date": date}, {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    # Get cash opening balance from settings
    setting = await db.settings.find_one({"key": "cash_opening_balance"}, {"_id": 0})
    cash_opening = setting.get("value", 0) if setting else 0
    cash_opening_date = setting.get("as_on_date", "2025-04-01") if setting else "2025-04-01"
    
    # Get previous day's closing as opening (considering opening balance)
    prev_txns = await db.transactions.find(
        {"date": {"$gte": cash_opening_date, "$lt": date}}, {"_id": 0}
    ).to_list(100000)
    
    opening = cash_opening
    for t in prev_txns:
        if t["transaction_type"] == "credit":
            opening += t["amount"]
        else:
            opening -= t["amount"]
    
    total_credit = sum(t["amount"] for t in transactions if t["transaction_type"] == "credit")
    total_debit = sum(t["amount"] for t in transactions if t["transaction_type"] == "debit")
    
    return CashBookSummary(
        date=date,
        opening_balance=opening,
        total_credit=total_credit,
        total_debit=total_debit,
        closing_balance=opening + total_credit - total_debit,
        transactions=transactions
    )

@api_router.get("/cashbook/monthly/{month}")
async def get_monthly_cashbook(month: str):
    transactions = await db.transactions.find(
        {"date": {"$regex": f"^{month}"}}, {"_id": 0}
    ).sort("date", 1).to_list(100000)
    
    # Group by date
    from collections import defaultdict
    daily_data = defaultdict(lambda: {"credit": 0, "debit": 0, "transactions": []})
    
    for t in transactions:
        d = t["date"]
        daily_data[d]["transactions"].append(t)
        if t["transaction_type"] == "credit":
            daily_data[d]["credit"] += t["amount"]
        else:
            daily_data[d]["debit"] += t["amount"]
    
    # Calculate running balance
    result = []
    running = 0
    for date in sorted(daily_data.keys()):
        data = daily_data[date]
        running = running + data["credit"] - data["debit"]
        result.append({
            "date": date,
            "credit": data["credit"],
            "debit": data["debit"],
            "balance": running,
            "transaction_count": len(data["transactions"])
        })
    
    total_credit = sum(d["credit"] for d in result)
    total_debit = sum(d["debit"] for d in result)
    
    return {
        "month": month,
        "total_credit": total_credit,
        "total_debit": total_debit,
        "net_balance": total_credit - total_debit,
        "daily_summary": result
    }

# Expense APIs
@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense: ExpenseCreate):
    expense_obj = Expense(**expense.model_dump())
    
    # Auto-create transaction in cash book
    txn = Transaction(
        date=expense.date,
        party_id=expense.party_id,
        transaction_type=TransactionType.DEBIT,
        amount=expense.amount,
        payment_mode=expense.payment_mode,
        description=expense.description,
        category=expense.category,
        reference_id=expense_obj.id,
        reference_type="expense"
    )
    await db.transactions.insert_one(txn.model_dump())
    expense_obj.transaction_id = txn.id
    
    # Update party balance if linked
    if expense.party_id:
        await db.parties.update_one(
            {"id": expense.party_id},
            {"$inc": {"current_balance": expense.amount}}
        )
    
    await db.expenses.insert_one(expense_obj.model_dump())
    return expense_obj

@api_router.get("/expenses", response_model=List[Expense])
async def get_all_expenses(month: Optional[str] = None, category: Optional[str] = None):
    query = {}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    if category:
        query["category"] = category
    
    expenses = await db.expenses.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    return expenses

@api_router.get("/expenses/summary/{month}")
async def get_expense_summary(month: str):
    expenses = await db.expenses.find(
        {"date": {"$regex": f"^{month}"}}, {"_id": 0}
    ).to_list(10000)
    
    # Group by category
    from collections import defaultdict
    category_totals = defaultdict(float)
    for e in expenses:
        category_totals[e["category"]] += e["amount"]
    
    total = sum(category_totals.values())
    
    return {
        "month": month,
        "total_expenses": total,
        "by_category": dict(category_totals),
        "expense_count": len(expenses)
    }

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    expense = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Delete linked transaction
    if expense.get("transaction_id"):
        await delete_transaction(expense["transaction_id"])
    
    await db.expenses.delete_one({"id": expense_id})
    return {"message": "Expense deleted"}

# ==================== SIMPLIFIED P&L & BALANCE SHEET (Connected to existing system) ====================

@api_router.get("/reports/simple-profit-loss")
async def get_simple_profit_loss(month: Optional[str] = None, fy: Optional[str] = None):
    """P&L based on existing Cash Book transactions
    
    Args:
        month: Filter by month (YYYY-MM)
        fy: Filter by Financial Year ID (April-March)
    """
    query = {}
    period_label = "All Time"
    
    if month:
        query["date"] = {"$regex": f"^{month}"}
        period_label = month
    elif fy:
        # Get FY dates
        fy_data = await db.financial_years.find_one({"id": fy}, {"_id": 0})
        if fy_data:
            query["date"] = {"$gte": fy_data["start_date"], "$lte": fy_data["end_date"]}
            period_label = f"FY {fy_data['name']}"
    
    # Get all transactions
    transactions = await db.transactions.find(query, {"_id": 0}).to_list(100000)
    
    # Calculate totals
    total_income = 0  # Credit transactions
    total_expense = 0  # Debit transactions
    
    income_breakdown = {}
    expense_breakdown = {}
    
    for txn in transactions:
        amount = txn.get("amount", 0)
        category = txn.get("category") or "other"
        
        if txn["transaction_type"] == "credit":
            total_income += amount
            income_breakdown[category] = income_breakdown.get(category, 0) + amount
        else:  # debit
            total_expense += amount
            expense_breakdown[category] = expense_breakdown.get(category, 0) + amount
    
    # Get expenses summary too
    expense_query = {"date": {"$regex": f"^{month}"}} if month else {}
    expenses = await db.expenses.find(expense_query, {"_id": 0}).to_list(10000)
    
    expense_by_category = {}
    for exp in expenses:
        cat = exp.get("category", "other")
        expense_by_category[cat] = expense_by_category.get(cat, 0) + exp.get("amount", 0)
    
    net_profit = total_income - total_expense
    
    return {
        "period": period_label,
        "month": month or "All Time",
        "income": {
            "total": total_income,
            "breakdown": income_breakdown
        },
        "expenses": {
            "total": total_expense,
            "breakdown": expense_breakdown,
            "by_category": expense_by_category
        },
        "net_profit": net_profit,
        "is_profit": net_profit >= 0,
        "transaction_count": len(transactions)
    }

@api_router.get("/reports/simple-balance-sheet")
async def get_simple_balance_sheet(as_on_date: Optional[str] = None, fy: Optional[str] = None):
    """Balance Sheet based on existing Cash Book and Party Ledger
    
    Args:
        as_on_date: Calculate balance sheet as on specific date (YYYY-MM-DD)
        fy: Filter by Financial Year ID
    """
    date_filter = {}
    period_label = "All Time"
    
    if as_on_date:
        date_filter = {"date": {"$lte": as_on_date}}
        period_label = f"As on {as_on_date}"
    elif fy:
        fy_data = await db.financial_years.find_one({"id": fy}, {"_id": 0})
        if fy_data:
            date_filter = {"date": {"$gte": fy_data["start_date"], "$lte": fy_data["end_date"]}}
            period_label = f"FY {fy_data['name']}"
    
    # ASSETS
    # 1. Cash (from Cash Book - net balance including opening balance)
    setting = await db.settings.find_one({"key": "cash_opening_balance"}, {"_id": 0})
    cash_opening = setting.get("value", 0) if setting else 0
    
    all_transactions = await db.transactions.find(date_filter, {"_id": 0}).to_list(100000) if date_filter else await db.transactions.find({}, {"_id": 0}).to_list(100000)
    cash_balance = cash_opening
    for txn in all_transactions:
        if txn["transaction_type"] == "credit":
            cash_balance += txn.get("amount", 0)
        else:
            cash_balance -= txn.get("amount", 0)
    
    # 2. Debtors (Parties who owe us - positive balance)
    parties = await db.parties.find({}, {"_id": 0}).to_list(10000)
    total_debtors = sum(p.get("current_balance", 0) for p in parties if p.get("current_balance", 0) > 0)
    debtors_list = [{"name": p["name"], "amount": p["current_balance"]} for p in parties if p.get("current_balance", 0) > 0]
    
    # 3. Advances given to staff
    advances = await db.advances.find({}, {"_id": 0}).to_list(10000)
    total_advances = sum(a.get("amount", 0) for a in advances)
    
    # 4. Chit Fund Investments
    chits = await db.chit_funds.find({}, {"_id": 0}).to_list(1000)
    total_chit_invested = sum(c.get("total_paid", 0) for c in chits)
    
    # 5. Interest Receivable (from interest accounts)
    interest_accounts = await db.interest_accounts.find({"is_active": True}, {"_id": 0}).to_list(1000)
    total_interest_receivable = sum(a.get("principal_amount", 0) for a in interest_accounts)
    
    total_assets = cash_balance + total_debtors + total_advances + total_chit_invested + total_interest_receivable
    
    # LIABILITIES
    # 1. Creditors (Parties we owe - negative balance)
    total_creditors = sum(abs(p.get("current_balance", 0)) for p in parties if p.get("current_balance", 0) < 0)
    creditors_list = [{"name": p["name"], "amount": abs(p["current_balance"])} for p in parties if p.get("current_balance", 0) < 0]
    
    # 2. Staff Salaries Payable (calculated but not paid)
    # For simplicity, assume all salaries are paid
    salaries_payable = 0
    
    total_liabilities = total_creditors + salaries_payable
    
    # CAPITAL
    # Net Worth = Assets - Liabilities
    capital = total_assets - total_liabilities
    
    # Chit Fund Won (income that's part of capital)
    chit_won = sum(c.get("won_amount", 0) for c in chits if c.get("is_won"))
    
    return {
        "as_on_date": as_on_date or datetime.now().strftime("%Y-%m-%d"),
        "period": period_label,
        "assets": {
            "current_assets": {
                "cash_balance": cash_balance,
                "debtors": {
                    "total": total_debtors,
                    "list": debtors_list[:10]  # Top 10
                },
                "advances_to_staff": total_advances,
                "chit_fund_investment": total_chit_invested,
                "interest_receivable": total_interest_receivable
            },
            "total": total_assets
        },
        "liabilities": {
            "current_liabilities": {
                "creditors": {
                    "total": total_creditors,
                    "list": creditors_list[:10]  # Top 10
                },
                "salaries_payable": salaries_payable
            },
            "total": total_liabilities
        },
        "capital": {
            "net_worth": capital,
            "chit_fund_won": chit_won
        },
        "summary": {
            "total_assets": total_assets,
            "total_liabilities": total_liabilities,
            "net_worth": capital,
            "is_balanced": True  # Assets = Liabilities + Capital by definition
        }
    }

# Old Pay Salary API (deprecated - use /salary/pay instead)
@api_router.post("/pay-salary-old/{staff_id}/{month}")
async def pay_salary_old(staff_id: str, month: str, payment_mode: PaymentMode = PaymentMode.CASH):
    """Pay salary and auto-add to cash book"""
    # Calculate salary
    salary_data = await calculate_salary(staff_id, month)
    
    if salary_data.total_earned <= 0:
        raise HTTPException(status_code=400, detail="No salary to pay")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Check if already paid
    existing = await db.transactions.find_one({
        "reference_id": f"salary_{staff_id}_{month}",
        "reference_type": "salary"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Salary already paid for this month")
    
    # Deduct advances
    advances = await db.advances.find({
        "staff_id": staff_id,
        "date": {"$regex": f"^{month}"}
    }, {"_id": 0}).to_list(100)
    total_advance = sum(a["amount"] for a in advances)
    
    net_salary = salary_data.total_earned - total_advance
    
    # Create expense
    expense = Expense(
        date=today,
        category=ExpenseCategory.SALARY,
        amount=net_salary,
        payment_mode=payment_mode,
        description=f"Salary - {salary_data.staff_name} ({month}) | Earned: ₹{salary_data.total_earned}, Advance: ₹{total_advance}"
    )
    
    # Create transaction
    txn = Transaction(
        date=today,
        transaction_type=TransactionType.DEBIT,
        amount=net_salary,
        payment_mode=payment_mode,
        description=f"Salary Payment - {salary_data.staff_name} ({month})",
        category=ExpenseCategory.SALARY,
        reference_id=f"salary_{staff_id}_{month}",
        reference_type="salary"
    )
    await db.transactions.insert_one(txn.model_dump())
    expense.transaction_id = txn.id
    await db.expenses.insert_one(expense.model_dump())
    
    return {
        "message": "Salary paid successfully",
        "staff_name": salary_data.staff_name,
        "gross_salary": salary_data.total_earned,
        "advance_deducted": total_advance,
        "net_paid": net_salary,
        "payment_mode": payment_mode,
        "transaction_id": txn.id
    }

# Reports API
@api_router.get("/reports/profit-loss/{month}")
async def get_profit_loss(month: str):
    transactions = await db.transactions.find(
        {"date": {"$regex": f"^{month}"}}, {"_id": 0}
    ).to_list(100000)
    
    total_income = sum(t["amount"] for t in transactions if t["transaction_type"] == "credit")
    total_expense = sum(t["amount"] for t in transactions if t["transaction_type"] == "debit")
    
    # Expense breakdown
    from collections import defaultdict
    expense_by_category = defaultdict(float)
    for t in transactions:
        if t["transaction_type"] == "debit" and t.get("category"):
            expense_by_category[t["category"]] += t["amount"]
    
    return {
        "month": month,
        "total_income": total_income,
        "total_expense": total_expense,
        "net_profit": total_income - total_expense,
        "expense_breakdown": dict(expense_by_category)
    }

@api_router.get("/reports/payment-mode/{month}")
async def get_payment_mode_report(month: str):
    transactions = await db.transactions.find(
        {"date": {"$regex": f"^{month}"}}, {"_id": 0}
    ).to_list(100000)
    
    from collections import defaultdict
    mode_data = defaultdict(lambda: {"credit": 0, "debit": 0})
    
    for t in transactions:
        mode = t["payment_mode"]
        if t["transaction_type"] == "credit":
            mode_data[mode]["credit"] += t["amount"]
        else:
            mode_data[mode]["debit"] += t["amount"]
    
    return {
        "month": month,
        "by_payment_mode": dict(mode_data)
    }

# ==================== CHIT FUND APIs (Single User Tracking) ====================

@api_router.post("/chit-funds", response_model=ChitFund)
async def create_chit_fund(chit: ChitFundCreate):
    chit_obj = ChitFund(**chit.model_dump())
    doc = chit_obj.model_dump()
    await db.chit_funds.insert_one(doc)
    
    # Auto-create sub-ledger for chit fund under "Chit Fund Investment" parent
    await get_or_create_sub_ledger(
        name=f"Chit - {chit.name}",
        parent_name="Chit Fund Investment",
        parent_account_head="current_asset"
    )
    
    return chit_obj

def migrate_chit_data(chit: dict) -> dict:
    """Migrate old chit data format to new format"""
    # Handle old field names -> new field names
    if "total_amount" in chit and "chit_value" not in chit:
        chit["chit_value"] = chit.pop("total_amount")
    if "is_won" in chit and "is_lifted" not in chit:
        chit["is_lifted"] = chit.pop("is_won")
    if "won_month" in chit and "lifted_month" not in chit:
        chit["lifted_month"] = chit.pop("won_month")
    if "won_amount" in chit and "lifted_amount" not in chit:
        chit["lifted_amount"] = chit.pop("won_amount")
    # Ensure new fields have defaults
    if "total_dividend" not in chit:
        chit["total_dividend"] = 0.0
    return chit

@api_router.get("/chit-funds", response_model=List[ChitFund])
async def get_all_chit_funds():
    chits = await db.chit_funds.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    # Migrate old data format to new format
    return [migrate_chit_data(chit) for chit in chits]

@api_router.get("/chit-funds/{chit_id}", response_model=ChitFund)
async def get_chit_fund(chit_id: str):
    chit = await db.chit_funds.find_one({"id": chit_id}, {"_id": 0})
    if not chit:
        raise HTTPException(status_code=404, detail="Chit fund not found")
    return migrate_chit_data(chit)

@api_router.put("/chit-funds/{chit_id}", response_model=ChitFund)
async def update_chit_fund(chit_id: str, chit_update: ChitFundUpdate):
    update_data = {k: v for k, v in chit_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.chit_funds.update_one({"id": chit_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Chit fund not found")
    
    updated = await db.chit_funds.find_one({"id": chit_id}, {"_id": 0})
    return updated

@api_router.delete("/chit-funds/{chit_id}")
async def delete_chit_fund(chit_id: str):
    # Check if chit has entries
    entry_count = await db.chit_monthly_entries.count_documents({"chit_id": chit_id})
    if entry_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete chit with {entry_count} monthly entries. Delete entries first.")
    
    result = await db.chit_funds.delete_one({"id": chit_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chit fund not found")
    return {"message": "Chit fund deleted"}

# Add Monthly Entry (EMI + Dividend Received)
@api_router.post("/chit-funds/{chit_id}/monthly-entry")
async def add_chit_monthly_entry(chit_id: str, entry: ChitMonthlyEntryCreate):
    """Add monthly entry - EMI paid + Dividend received this month"""
    chit = await db.chit_funds.find_one({"id": chit_id}, {"_id": 0})
    if not chit:
        raise HTTPException(status_code=404, detail="Chit fund not found")
    
    # Check if this month's entry already exists
    existing = await db.chit_monthly_entries.find_one({
        "chit_id": chit_id,
        "month_number": entry.month_number
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Month {entry.month_number} ki entry already hai")
    
    # Calculate effective cost
    effective_cost = entry.paid_amount - entry.dividend_received
    
    # Create entry
    entry_obj = ChitMonthlyEntry(**entry.model_dump())
    entry_obj.effective_cost = round(effective_cost, 2)
    
    # Auto-create transaction in cash book (Debit - EMI going out)
    txn = Transaction(
        date=entry.payment_date,
        transaction_type=TransactionType.DEBIT,
        amount=entry.paid_amount,
        payment_mode=entry.payment_mode,
        description=f"Chit: {chit['name']} - Month {entry.month_number} | EMI: ₹{entry.paid_amount:,.0f} | Mila: ₹{entry.dividend_received:,.0f}",
        category=ExpenseCategory.CHIT_FUND,
        reference_id=chit_id,
        reference_type="chit_monthly"
    )
    await db.transactions.insert_one(txn.model_dump())
    entry_obj.transaction_id = txn.id
    
    # Save entry
    await db.chit_monthly_entries.insert_one(entry_obj.model_dump())
    
    # Update chit fund totals
    await db.chit_funds.update_one(
        {"id": chit_id},
        {
            "$inc": {
                "total_paid": entry.paid_amount,
                "total_dividend": entry.dividend_received,
                "payments_count": 1
            }
        }
    )
    
    return {
        "message": "Entry add ho gayi",
        "month": entry.month_number,
        "paid": entry.paid_amount,
        "dividend_received": entry.dividend_received,
        "effective_cost": effective_cost,
        "transaction_id": txn.id
    }

# Get all monthly entries for a chit
@api_router.get("/chit-funds/{chit_id}/monthly-entries")
async def get_chit_monthly_entries(chit_id: str):
    entries = await db.chit_monthly_entries.find(
        {"chit_id": chit_id}, {"_id": 0}
    ).sort("month_number", 1).to_list(1000)
    return entries

# Get paid months list (for dropdown)
@api_router.get("/chit-funds/{chit_id}/paid-months")
async def get_chit_paid_months(chit_id: str):
    """Get list of which months are already paid"""
    chit = await db.chit_funds.find_one({"id": chit_id}, {"_id": 0})
    if not chit:
        raise HTTPException(status_code=404, detail="Chit fund not found")
    
    entries = await db.chit_monthly_entries.find(
        {"chit_id": chit_id}, {"month_number": 1, "_id": 0}
    ).to_list(1000)
    
    paid_months = [e["month_number"] for e in entries]
    duration = chit.get("duration_months", 20)
    
    return {
        "duration_months": duration,
        "paid_months": paid_months,
        "pending_months": [m for m in range(1, duration + 1) if m not in paid_months]
    }

# Mark Chit as Lifted (Uthaya)
@api_router.post("/chit-funds/{chit_id}/lift")
async def lift_chit(chit_id: str, lifted_month: int, lifted_amount: float, payment_mode: PaymentMode = PaymentMode.BANK_TRANSFER):
    """Mark chit as lifted (user won the bid) and add credit entry to cash book"""
    chit = await db.chit_funds.find_one({"id": chit_id}, {"_id": 0})
    if not chit:
        raise HTTPException(status_code=404, detail="Chit fund not found")
    
    if chit.get("is_lifted"):
        raise HTTPException(status_code=400, detail="Chit already lifted")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Create credit transaction (money coming in)
    txn = Transaction(
        date=today,
        transaction_type=TransactionType.CREDIT,
        amount=lifted_amount,
        payment_mode=payment_mode,
        description=f"Chit Lifted: {chit['name']} - Month {lifted_month} | Received: ₹{lifted_amount:,.0f}",
        category=None,
        reference_id=chit_id,
        reference_type="chit_lifted"
    )
    await db.transactions.insert_one(txn.model_dump())
    
    # Update chit fund
    await db.chit_funds.update_one(
        {"id": chit_id},
        {
            "$set": {
                "is_lifted": True,
                "lifted_month": lifted_month,
                "lifted_amount": lifted_amount
            }
        }
    )
    
    return {
        "message": "Chit lifted successfully",
        "chit_name": chit["name"],
        "lifted_month": lifted_month,
        "lifted_amount": lifted_amount,
        "transaction_id": txn.id
    }

# Delete Monthly Entry
@api_router.delete("/chit-monthly-entries/{entry_id}")
async def delete_chit_monthly_entry(entry_id: str):
    entry = await db.chit_monthly_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    # Delete linked transaction
    if entry.get("transaction_id"):
        await db.transactions.delete_one({"id": entry["transaction_id"]})
    
    # Get dividend from entry (handle both old and new field names)
    dividend = entry.get("dividend_received", entry.get("dividend", 0))
    
    # Update chit fund totals
    await db.chit_funds.update_one(
        {"id": entry["chit_id"]},
        {
            "$inc": {
                "total_paid": -entry["paid_amount"],
                "total_dividend": -dividend,
                "payments_count": -1
            }
        }
    )
    
    await db.chit_monthly_entries.delete_one({"id": entry_id})
    return {"message": "Entry delete ho gayi"}

# Get Chit Fund Complete Summary (Final Profit Calculation)
@api_router.get("/chit-funds/{chit_id}/summary")
async def get_chit_summary_single(chit_id: str):
    """Get complete summary of a chit - Total Paid, Dividends, Lifted Amount, Net Profit"""
    chit = await db.chit_funds.find_one({"id": chit_id}, {"_id": 0})
    if not chit:
        raise HTTPException(status_code=404, detail="Chit fund not found")
    
    # Migrate old data format
    chit = migrate_chit_data(chit)
    
    entries = await db.chit_monthly_entries.find(
        {"chit_id": chit_id}, {"_id": 0}
    ).sort("month_number", 1).to_list(1000)
    
    total_paid = chit.get("total_paid", 0)
    total_dividend = chit.get("total_dividend", 0)
    lifted_amount = chit.get("lifted_amount", 0) or 0 if chit.get("is_lifted") else 0
    
    # Net Profit = Total Dividend + Lifted Amount - Total Paid
    # If not lifted yet, we show projected profit based on dividends
    if chit.get("is_lifted"):
        # Chit completed perspective: Profit = What I got - What I paid
        # What I got = Lifted Amount + All Dividends
        # What I paid = All EMIs
        net_profit = lifted_amount + total_dividend - total_paid
    else:
        # Chit ongoing: Show dividend earned so far as "savings"
        net_profit = total_dividend  # Dividend is effectively money saved
    
    # Remaining months
    remaining_months = chit.get("duration_months", 0) - chit.get("payments_count", 0)
    remaining_amount = remaining_months * chit.get("monthly_installment", 0)
    
    return {
        "chit": chit,
        "entries": entries,
        "summary": {
            "total_paid": total_paid,
            "total_dividend": total_dividend,
            "is_lifted": chit.get("is_lifted", False),
            "lifted_amount": lifted_amount,
            "lifted_month": chit.get("lifted_month"),
            "net_profit": net_profit,
            "is_profit": net_profit >= 0,
            "months_completed": chit.get("payments_count", 0),
            "remaining_months": remaining_months,
            "remaining_amount": remaining_amount,
            "effective_cost_per_month": (total_paid - total_dividend) / max(chit.get("payments_count", 1), 1)
        }
    }

# Overall Chit Summary
@api_router.get("/chit-funds/summary/all")
async def get_chit_summary_all():
    chits = await db.chit_funds.find({}, {"_id": 0}).to_list(1000)
    # Migrate old data format
    chits = [migrate_chit_data(c) for c in chits]
    
    active_chits = [c for c in chits if c.get("is_active", True) and not c.get("is_lifted", False)]
    lifted_chits = [c for c in chits if c.get("is_lifted", False)]
    
    total_paid = sum(c.get("total_paid", 0) for c in chits)
    total_dividend = sum(c.get("total_dividend", 0) for c in chits)
    total_lifted = sum(c.get("lifted_amount", 0) or 0 for c in lifted_chits)
    
    # Remaining investment needed
    total_remaining = sum(
        (c.get("monthly_installment", 0) * c.get("duration_months", 0)) - c.get("total_paid", 0) 
        for c in active_chits
    )
    
    # Net position
    net_profit = total_dividend + total_lifted - total_paid
    
    return {
        "total_chits": len(chits),
        "active_chits": len(active_chits),
        "lifted_chits": len(lifted_chits),
        "total_paid": total_paid,
        "total_dividend": total_dividend,
        "total_lifted": total_lifted,
        "net_profit": net_profit,
        "is_profit": net_profit >= 0,
        "remaining_investment": total_remaining
    }

# ==================== PROPER ACCOUNTING APIs ====================

# Financial Year APIs
@api_router.post("/financial-years", response_model=FinancialYear)
async def create_financial_year(fy: FinancialYearBase):
    # Deactivate other years if this is active
    if fy.is_active:
        await db.financial_years.update_many({}, {"$set": {"is_active": False}})
    
    fy_obj = FinancialYear(**fy.model_dump())
    await db.financial_years.insert_one(fy_obj.model_dump())
    return fy_obj

@api_router.get("/financial-years")
async def get_financial_years():
    years = await db.financial_years.find({}, {"_id": 0}).sort("start_date", -1).to_list(100)
    return years

@api_router.get("/financial-years/active")
async def get_active_financial_year():
    fy = await db.financial_years.find_one({"is_active": True}, {"_id": 0})
    if not fy:
        # Create default FY if none exists
        today = datetime.now()
        if today.month >= 4:
            start_year = today.year
        else:
            start_year = today.year - 1
        
        default_fy = FinancialYear(
            name=f"{start_year}-{str(start_year+1)[-2:]}",
            start_date=f"{start_year}-04-01",
            end_date=f"{start_year+1}-03-31",
            is_active=True
        )
        await db.financial_years.insert_one(default_fy.model_dump())
        return default_fy.model_dump()
    return fy

@api_router.put("/financial-years/{fy_id}/activate")
async def activate_financial_year(fy_id: str):
    await db.financial_years.update_many({}, {"$set": {"is_active": False}})
    result = await db.financial_years.update_one({"id": fy_id}, {"$set": {"is_active": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Financial year not found")
    return {"message": "Financial year activated"}

# Chart of Accounts APIs
@api_router.post("/accounts", response_model=Account)
async def create_account(account: AccountCreate):
    # Check if account code already exists
    if account.code:
        existing = await db.accounts.find_one({"code": account.code})
        if existing:
            raise HTTPException(status_code=400, detail="Account code already exists")
    
    account_obj = Account(**account.model_dump())
    account_obj.current_balance = account.opening_balance
    await db.accounts.insert_one(account_obj.model_dump())
    return account_obj

@api_router.get("/accounts")
async def get_all_accounts(account_type: Optional[str] = None, sub_type: Optional[str] = None):
    query = {}
    if account_type:
        query["account_type"] = account_type
    if sub_type:
        query["sub_type"] = sub_type
    
    accounts = await db.accounts.find(query, {"_id": 0}).sort("code", 1).to_list(10000)
    return accounts

@api_router.get("/accounts/{account_id}")
async def get_account(account_id: str):
    account = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account

@api_router.put("/accounts/{account_id}", response_model=Account)
async def update_account(account_id: str, account_update: AccountUpdate):
    update_data = {k: v for k, v in account_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    account = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if account.get("is_system"):
        raise HTTPException(status_code=400, detail="Cannot modify system account")
    
    await db.accounts.update_one({"id": account_id}, {"$set": update_data})
    updated = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    return updated

@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str):
    account = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if account.get("is_system"):
        raise HTTPException(status_code=400, detail="Cannot delete system account")
    
    # Check if account has journal entries
    entry_count = await db.journal_entries.count_documents({
        "entries.account_id": account_id
    })
    if entry_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete account with {entry_count} transactions")
    
    await db.accounts.delete_one({"id": account_id})
    return {"message": "Account deleted"}

@api_router.get("/accounts/grouped/all")
async def get_accounts_grouped():
    accounts = await db.accounts.find({}, {"_id": 0}).sort("code", 1).to_list(10000)
    
    grouped = {
        "asset": {"current_asset": [], "fixed_asset": []},
        "liability": {"current_liability": [], "long_term_liability": []},
        "capital": {"owners_capital": [], "drawings": [], "retained_earnings": []},
        "income": {"direct_income": [], "indirect_income": []},
        "expense": {"direct_expense": [], "indirect_expense": []}
    }
    
    for acc in accounts:
        acc_type = acc["account_type"]
        sub_type = acc["sub_type"]
        if acc_type in grouped and sub_type in grouped[acc_type]:
            grouped[acc_type][sub_type].append(acc)
    
    return grouped

# Journal Entry (Voucher) APIs
@api_router.post("/journal-entries", response_model=JournalEntry)
async def create_journal_entry(entry: JournalEntryCreate):
    # Validate double entry - Total Debit must equal Total Credit
    total_debit = sum(e.debit_amount for e in entry.entries)
    total_credit = sum(e.credit_amount for e in entry.entries)
    
    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(
            status_code=400, 
            detail=f"Debit ({total_debit}) and Credit ({total_credit}) must be equal"
        )
    
    # Validate all accounts exist
    for e in entry.entries:
        account = await db.accounts.find_one({"id": e.account_id})
        if not account:
            raise HTTPException(status_code=404, detail=f"Account {e.account_id} not found")
    
    # Get active financial year
    fy = await db.financial_years.find_one({"is_active": True}, {"_id": 0})
    
    entry_obj = JournalEntry(**entry.model_dump())
    entry_obj.financial_year = fy["id"] if fy else None
    
    # Generate voucher number if not provided
    if not entry_obj.voucher_no:
        count = await db.journal_entries.count_documents({"voucher_type": entry.voucher_type})
        prefix = {"payment": "PAY", "receipt": "REC", "journal": "JV", "contra": "CNT", "sales": "SAL", "purchase": "PUR"}.get(entry.voucher_type, "VCH")
        entry_obj.voucher_no = f"{prefix}-{count + 1:04d}"
    
    await db.journal_entries.insert_one(entry_obj.model_dump())
    
    # Update account balances
    for e in entry.entries:
        account = await db.accounts.find_one({"id": e.account_id}, {"_id": 0})
        acc_type = account["account_type"]
        
        # Accounting rules for balance update
        # Assets & Expenses: Debit increases, Credit decreases
        # Liabilities, Capital, Income: Credit increases, Debit decreases
        if acc_type in ["asset", "expense"]:
            balance_change = e.debit_amount - e.credit_amount
        else:
            balance_change = e.credit_amount - e.debit_amount
        
        await db.accounts.update_one(
            {"id": e.account_id},
            {"$inc": {"current_balance": balance_change}}
        )
    
    return entry_obj

@api_router.get("/journal-entries")
async def get_journal_entries(
    date: Optional[str] = None,
    voucher_type: Optional[str] = None,
    account_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    query = {}
    if date:
        query["date"] = date
    if voucher_type:
        query["voucher_type"] = voucher_type
    if account_id:
        query["entries.account_id"] = account_id
    if from_date and to_date:
        query["date"] = {"$gte": from_date, "$lte": to_date}
    elif from_date:
        query["date"] = {"$gte": from_date}
    elif to_date:
        query["date"] = {"$lte": to_date}
    
    entries = await db.journal_entries.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    return entries

@api_router.get("/journal-entries/{entry_id}")
async def get_journal_entry(entry_id: str):
    entry = await db.journal_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return entry

@api_router.delete("/journal-entries/{entry_id}")
async def delete_journal_entry(entry_id: str):
    entry = await db.journal_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    # Reverse account balances
    for e in entry["entries"]:
        account = await db.accounts.find_one({"id": e["account_id"]}, {"_id": 0})
        if account:
            acc_type = account["account_type"]
            if acc_type in ["asset", "expense"]:
                balance_change = -(e["debit_amount"] - e["credit_amount"])
            else:
                balance_change = -(e["credit_amount"] - e["debit_amount"])
            
            await db.accounts.update_one(
                {"id": e["account_id"]},
                {"$inc": {"current_balance": balance_change}}
            )
    
    await db.journal_entries.delete_one({"id": entry_id})
    return {"message": "Journal entry deleted"}

# Account Ledger API
@api_router.get("/accounts/{account_id}/ledger")
async def get_account_ledger(account_id: str, from_date: Optional[str] = None, to_date: Optional[str] = None):
    account = await db.accounts.find_one({"id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    query = {"entries.account_id": account_id}
    if from_date and to_date:
        query["date"] = {"$gte": from_date, "$lte": to_date}
    
    entries = await db.journal_entries.find(query, {"_id": 0}).sort("date", 1).to_list(100000)
    
    ledger = []
    running_balance = account.get("opening_balance", 0)
    acc_type = account["account_type"]
    
    for entry in entries:
        for line in entry["entries"]:
            if line["account_id"] == account_id:
                if acc_type in ["asset", "expense"]:
                    running_balance += line["debit_amount"] - line["credit_amount"]
                else:
                    running_balance += line["credit_amount"] - line["debit_amount"]
                
                ledger.append({
                    "date": entry["date"],
                    "voucher_no": entry.get("voucher_no", ""),
                    "voucher_type": entry["voucher_type"],
                    "narration": entry["narration"],
                    "debit": line["debit_amount"],
                    "credit": line["credit_amount"],
                    "balance": running_balance
                })
    
    return {
        "account": account,
        "opening_balance": account.get("opening_balance", 0),
        "current_balance": running_balance,
        "entries": ledger
    }

# Opening Balance APIs
@api_router.post("/opening-balances", response_model=OpeningBalance)
async def create_opening_balance(ob: OpeningBalanceCreate):
    # Check if opening balance already exists for this account and year
    existing = await db.opening_balances.find_one({
        "account_id": ob.account_id,
        "financial_year": ob.financial_year
    })
    if existing:
        # Update existing
        await db.opening_balances.update_one(
            {"id": existing["id"]},
            {"$set": {"amount": ob.amount, "balance_type": ob.balance_type}}
        )
        # Update account
        await db.accounts.update_one(
            {"id": ob.account_id},
            {"$set": {"opening_balance": ob.amount, "opening_balance_type": ob.balance_type, "current_balance": ob.amount}}
        )
        return await db.opening_balances.find_one({"id": existing["id"]}, {"_id": 0})
    
    ob_obj = OpeningBalance(**ob.model_dump())
    await db.opening_balances.insert_one(ob_obj.model_dump())
    
    # Update account
    await db.accounts.update_one(
        {"id": ob.account_id},
        {"$set": {"opening_balance": ob.amount, "opening_balance_type": ob.balance_type, "current_balance": ob.amount}}
    )
    
    return ob_obj

@api_router.get("/opening-balances/{financial_year}")
async def get_opening_balances(financial_year: str):
    balances = await db.opening_balances.find(
        {"financial_year": financial_year}, {"_id": 0}
    ).to_list(10000)
    return balances

# Trial Balance API
@api_router.get("/reports/trial-balance")
async def get_trial_balance(as_on_date: Optional[str] = None):
    accounts = await db.accounts.find({"is_active": True}, {"_id": 0}).sort("code", 1).to_list(10000)
    
    trial_balance = []
    total_debit = 0
    total_credit = 0
    
    for acc in accounts:
        balance = acc.get("current_balance", 0)
        acc_type = acc["account_type"]
        
        # Determine if balance is debit or credit based on account type
        if acc_type in ["asset", "expense"]:
            if balance >= 0:
                debit = balance
                credit = 0
            else:
                debit = 0
                credit = abs(balance)
        else:  # liability, capital, income
            if balance >= 0:
                debit = 0
                credit = balance
            else:
                debit = abs(balance)
                credit = 0
        
        if debit > 0 or credit > 0:
            trial_balance.append({
                "account_id": acc["id"],
                "account_name": acc["name"],
                "account_code": acc.get("code", ""),
                "account_type": acc_type,
                "sub_type": acc["sub_type"],
                "debit": debit,
                "credit": credit
            })
            total_debit += debit
            total_credit += credit
    
    return {
        "as_on_date": as_on_date or datetime.now().strftime("%Y-%m-%d"),
        "accounts": trial_balance,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "is_balanced": abs(total_debit - total_credit) < 0.01
    }

# Profit & Loss Statement API
@api_router.get("/reports/profit-loss-statement")
async def get_profit_loss_statement(from_date: Optional[str] = None, to_date: Optional[str] = None):
    # Get all income and expense accounts
    income_accounts = await db.accounts.find(
        {"account_type": "income", "is_active": True}, {"_id": 0}
    ).to_list(1000)
    expense_accounts = await db.accounts.find(
        {"account_type": "expense", "is_active": True}, {"_id": 0}
    ).to_list(1000)
    
    income_items = []
    expense_items = []
    total_income = 0
    total_expense = 0
    
    for acc in income_accounts:
        balance = acc.get("current_balance", 0)
        if balance != 0:
            income_items.append({
                "account_id": acc["id"],
                "account_name": acc["name"],
                "sub_type": acc["sub_type"],
                "amount": balance
            })
            total_income += balance
    
    for acc in expense_accounts:
        balance = acc.get("current_balance", 0)
        if balance != 0:
            expense_items.append({
                "account_id": acc["id"],
                "account_name": acc["name"],
                "sub_type": acc["sub_type"],
                "amount": balance
            })
            total_expense += balance
    
    net_profit = total_income - total_expense
    
    return {
        "period": {
            "from_date": from_date,
            "to_date": to_date
        },
        "income": {
            "direct_income": [i for i in income_items if i["sub_type"] == "direct_income"],
            "indirect_income": [i for i in income_items if i["sub_type"] == "indirect_income"],
            "total": total_income
        },
        "expenses": {
            "direct_expense": [e for e in expense_items if e["sub_type"] == "direct_expense"],
            "indirect_expense": [e for e in expense_items if e["sub_type"] == "indirect_expense"],
            "total": total_expense
        },
        "net_profit": net_profit,
        "is_profit": net_profit >= 0
    }

# Balance Sheet API
@api_router.get("/reports/balance-sheet")
async def get_balance_sheet(as_on_date: Optional[str] = None):
    # Get all asset, liability, and capital accounts
    asset_accounts = await db.accounts.find(
        {"account_type": "asset", "is_active": True}, {"_id": 0}
    ).to_list(1000)
    liability_accounts = await db.accounts.find(
        {"account_type": "liability", "is_active": True}, {"_id": 0}
    ).to_list(1000)
    capital_accounts = await db.accounts.find(
        {"account_type": "capital", "is_active": True}, {"_id": 0}
    ).to_list(1000)
    
    # Calculate net profit for the period
    income_accounts = await db.accounts.find({"account_type": "income"}, {"_id": 0}).to_list(1000)
    expense_accounts = await db.accounts.find({"account_type": "expense"}, {"_id": 0}).to_list(1000)
    total_income = sum(acc.get("current_balance", 0) for acc in income_accounts)
    total_expense = sum(acc.get("current_balance", 0) for acc in expense_accounts)
    net_profit = total_income - total_expense
    
    def process_accounts(accounts):
        items = []
        total = 0
        for acc in accounts:
            balance = abs(acc.get("current_balance", 0))
            if balance > 0:
                items.append({
                    "account_id": acc["id"],
                    "account_name": acc["name"],
                    "sub_type": acc["sub_type"],
                    "amount": balance
                })
                total += balance
        return items, total
    
    asset_items, total_assets = process_accounts(asset_accounts)
    liability_items, total_liabilities = process_accounts(liability_accounts)
    capital_items, total_capital = process_accounts(capital_accounts)
    
    # Add net profit to capital
    total_capital += net_profit
    
    return {
        "as_on_date": as_on_date or datetime.now().strftime("%Y-%m-%d"),
        "assets": {
            "current_assets": [a for a in asset_items if a["sub_type"] == "current_asset"],
            "fixed_assets": [a for a in asset_items if a["sub_type"] == "fixed_asset"],
            "total": total_assets
        },
        "liabilities": {
            "current_liabilities": [item for item in liability_items if item["sub_type"] == "current_liability"],
            "long_term_liabilities": [item for item in liability_items if item["sub_type"] == "long_term_liability"],
            "total": total_liabilities
        },
        "capital": {
            "items": capital_items,
            "net_profit": net_profit,
            "total": total_capital
        },
        "total_liabilities_and_capital": total_liabilities + total_capital,
        "is_balanced": abs(total_assets - (total_liabilities + total_capital)) < 0.01
    }

# Initialize Default Accounts
@api_router.post("/accounts/initialize-defaults")
async def initialize_default_accounts():
    """Create default chart of accounts for a new business"""
    
    # Check if accounts already exist
    existing = await db.accounts.count_documents({})
    if existing > 0:
        return {"message": f"Accounts already exist ({existing} accounts). Skipping initialization."}
    
    default_accounts = [
        # Current Assets
        {"name": "Cash in Hand", "account_type": "asset", "sub_type": "current_asset", "code": "1001", "is_system": True},
        {"name": "Bank Account", "account_type": "asset", "sub_type": "current_asset", "code": "1002", "is_system": True},
        {"name": "Sundry Debtors", "account_type": "asset", "sub_type": "current_asset", "code": "1003"},
        {"name": "Stock in Hand", "account_type": "asset", "sub_type": "current_asset", "code": "1004"},
        # Fixed Assets
        {"name": "Land & Building", "account_type": "asset", "sub_type": "fixed_asset", "code": "1101"},
        {"name": "Furniture & Fixtures", "account_type": "asset", "sub_type": "fixed_asset", "code": "1102"},
        {"name": "Machinery", "account_type": "asset", "sub_type": "fixed_asset", "code": "1103"},
        {"name": "Vehicles", "account_type": "asset", "sub_type": "fixed_asset", "code": "1104"},
        # Current Liabilities
        {"name": "Sundry Creditors", "account_type": "liability", "sub_type": "current_liability", "code": "2001"},
        {"name": "Duties & Taxes", "account_type": "liability", "sub_type": "current_liability", "code": "2002"},
        # Long Term Liabilities
        {"name": "Bank Loan", "account_type": "liability", "sub_type": "long_term_liability", "code": "2101"},
        {"name": "Secured Loans", "account_type": "liability", "sub_type": "long_term_liability", "code": "2102"},
        # Capital
        {"name": "Capital Account", "account_type": "capital", "sub_type": "owners_capital", "code": "3001", "is_system": True},
        {"name": "Drawings", "account_type": "capital", "sub_type": "drawings", "code": "3002"},
        {"name": "Retained Earnings", "account_type": "capital", "sub_type": "retained_earnings", "code": "3003"},
        # Direct Income
        {"name": "Sales Account", "account_type": "income", "sub_type": "direct_income", "code": "4001", "is_system": True},
        # Indirect Income
        {"name": "Interest Received", "account_type": "income", "sub_type": "indirect_income", "code": "4101"},
        {"name": "Commission Received", "account_type": "income", "sub_type": "indirect_income", "code": "4102"},
        {"name": "Other Income", "account_type": "income", "sub_type": "indirect_income", "code": "4103"},
        # Direct Expenses
        {"name": "Purchases Account", "account_type": "expense", "sub_type": "direct_expense", "code": "5001"},
        {"name": "Wages", "account_type": "expense", "sub_type": "direct_expense", "code": "5002"},
        {"name": "Freight Inward", "account_type": "expense", "sub_type": "direct_expense", "code": "5003"},
        # Indirect Expenses
        {"name": "Salary", "account_type": "expense", "sub_type": "indirect_expense", "code": "5101", "is_system": True},
        {"name": "Rent", "account_type": "expense", "sub_type": "indirect_expense", "code": "5102"},
        {"name": "Electricity", "account_type": "expense", "sub_type": "indirect_expense", "code": "5103"},
        {"name": "Telephone", "account_type": "expense", "sub_type": "indirect_expense", "code": "5104"},
        {"name": "Printing & Stationery", "account_type": "expense", "sub_type": "indirect_expense", "code": "5105"},
        {"name": "Interest Paid", "account_type": "expense", "sub_type": "indirect_expense", "code": "5106"},
        {"name": "Bank Charges", "account_type": "expense", "sub_type": "indirect_expense", "code": "5107"},
        {"name": "Miscellaneous Expenses", "account_type": "expense", "sub_type": "indirect_expense", "code": "5108"},
    ]
    
    created = []
    for acc_data in default_accounts:
        acc = Account(**acc_data)
        await db.accounts.insert_one(acc.model_dump())
        created.append(acc.name)
    
    return {"message": f"Created {len(created)} default accounts", "accounts": created}

# ==================== SETTINGS API ====================

class AppSettings(BaseModel):
    company_name: str = "Staff Manager"
    company_address: Optional[str] = ""
    company_phone: Optional[str] = ""
    footer_text: Optional[str] = ""

@api_router.get("/settings")
async def get_settings():
    settings = await db.settings.find_one({"type": "app_settings"}, {"_id": 0})
    if not settings:
        return AppSettings().model_dump()
    return settings

@api_router.post("/settings")
async def save_settings(settings: AppSettings):
    await db.settings.update_one(
        {"type": "app_settings"},
        {"$set": {**settings.model_dump(), "type": "app_settings", "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"message": "Settings saved successfully"}

# ==================== BACKUP API ====================

@api_router.get("/backup/export")
async def export_backup():
    """Export all data as JSON for backup"""
    backup_data = {
        "backup_date": datetime.now(timezone.utc).isoformat(),
        "version": "1.0",
        "collections": {}
    }
    
    collections_to_backup = [
        "staff", "attendance", "salary_payments", "advances",
        "parties", "transactions", "cash_book",
        "expenses", "interest_accounts",
        "chit_funds", "chit_monthly_entries",
        "financial_years", "opening_balances",
        "settings"
    ]
    
    for coll_name in collections_to_backup:
        coll = db[coll_name]
        docs = await coll.find({}, {"_id": 0}).to_list(100000)
        backup_data["collections"][coll_name] = docs
    
    return backup_data

@api_router.post("/backup/restore")
async def restore_backup(backup_data: dict):
    """Restore data from backup JSON"""
    if "collections" not in backup_data:
        raise HTTPException(status_code=400, detail="Invalid backup format")
    
    restored = []
    for coll_name, docs in backup_data["collections"].items():
        if not docs:
            continue
        coll = db[coll_name]
        # Clear existing data
        await coll.delete_many({})
        # Insert backup data
        if isinstance(docs, list) and len(docs) > 0:
            await coll.insert_many(docs)
            restored.append(f"{coll_name}: {len(docs)}")
    
    return {"message": "Backup restored successfully", "restored": restored}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
