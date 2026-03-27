from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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

# Enums
class AttendanceStatus(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"
    HALF_DAY = "half_day"

# Models
class StaffBase(BaseModel):
    name: str
    phone: str
    joining_date: str
    monthly_salary: float

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
    OTHER = "other"

# Party (Ledger Account) Models
class PartyBase(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    opening_balance: float = 0.0
    balance_type: TransactionType = TransactionType.DEBIT  # debit = we owe them, credit = they owe us

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
    interest_rate: float
    days: int
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

# Staff APIs
@api_router.post("/staff", response_model=Staff)
async def create_staff(staff: StaffCreate):
    staff_obj = Staff(**staff.model_dump())
    doc = staff_obj.model_dump()
    await db.staff.insert_one(doc)
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

# Advance APIs
@api_router.post("/advances", response_model=Advance)
async def create_advance(advance: AdvanceCreate):
    # Verify staff exists
    staff = await db.staff.find_one({"id": advance.staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    advance_obj = Advance(**advance.model_dump())
    doc = advance_obj.model_dump()
    await db.advances.insert_one(doc)
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
    
    result = await db.parties.delete_one({"id": party_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Party not found")
    return {"message": "Party deleted successfully"}

# Party Ledger API
@api_router.get("/parties/{party_id}/ledger")
async def get_party_ledger(party_id: str):
    party = await db.parties.find_one({"id": party_id}, {"_id": 0})
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    
    transactions = await db.transactions.find(
        {"party_id": party_id}, {"_id": 0}
    ).sort("date", 1).to_list(10000)
    
    ledger_entries = []
    running_balance = party.get("opening_balance", 0)
    
    for txn in transactions:
        if txn["transaction_type"] == "debit":
            running_balance += txn["amount"]
            ledger_entries.append(LedgerEntry(
                date=txn["date"],
                description=txn["description"],
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
                description=txn["description"],
                debit=0,
                credit=txn["amount"],
                balance=running_balance,
                payment_mode=txn["payment_mode"],
                transaction_id=txn["id"]
            ))
    
    return {
        "party": party,
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
    
    # Simple interest calculation: P * R * T / 365
    principal = account["principal_amount"]
    rate = account["interest_rate"]
    interest = (principal * rate * days) / (365 * 100)
    
    return InterestCalculation(
        account_id=account_id,
        party_name=party["name"] if party else "Unknown",
        principal=principal,
        interest_rate=rate,
        days=days,
        calculated_interest=round(interest, 2),
        total_amount=round(principal + interest, 2)
    )

@api_router.post("/interest-accounts/{account_id}/add-to-cashbook")
async def add_interest_to_cashbook(account_id: str, end_date: Optional[str] = None):
    """Add calculated interest to cash book and party ledger"""
    account = await db.interest_accounts.find_one({"id": account_id}, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Interest account not found")
    
    party = await db.parties.find_one({"id": account["party_id"]}, {"_id": 0})
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    
    # Calculate interest
    start = datetime.strptime(account["start_date"], "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d") if end_date else datetime.now(timezone.utc)
    days = max(0, (end - start).days)
    
    principal = account["principal_amount"]
    rate = account["interest_rate"]
    interest = round((principal * rate * days) / (365 * 100), 2)
    
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
        description=f"Interest (Byaj) @ {rate}% for {days} days on ₹{principal}",
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

# Cash Book API
@api_router.get("/cashbook/{date}")
async def get_cashbook(date: str):
    transactions = await db.transactions.find(
        {"date": date}, {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    # Get previous day's closing as opening
    prev_txns = await db.transactions.find(
        {"date": {"$lt": date}}, {"_id": 0}
    ).to_list(100000)
    
    opening = 0
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

# Auto-link: Pay Salary API
@api_router.post("/pay-salary/{staff_id}/{month}")
async def pay_salary(staff_id: str, month: str, payment_mode: PaymentMode = PaymentMode.CASH):
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
