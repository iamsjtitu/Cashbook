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

# Root API
@api_router.get("/")
async def root():
    return {"message": "Staff Attendance & Salary Management API"}

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
