"""
Database initialization and client management using Motor for MongoDB.
"""

import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger(__name__)

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

db_instance = MongoDB()

async def init_db():
    """Initialize MongoDB client and database connection."""
    try:
        logger.info("Connecting to MongoDB at %s", settings.MONGODB_URL)
        db_instance.client = AsyncIOMotorClient(settings.MONGODB_URL)
        db_instance.db = db_instance.client[settings.DATABASE_NAME]
        
        # Verify connection
        await db_instance.client.admin.command('ping')
        logger.info("Successfully connected to MongoDB.")
        
        # Optional: Create indexes
        await db_instance.db.damage_reports.create_index("image_path")
        await db_instance.db.damage_reports.create_index("category")
        await db_instance.db.damage_reports.create_index("created_at")
        
    except Exception as e:
        logger.error("Could not connect to MongoDB: %s", e)
        raise e

async def get_db():
    """Dependency that provides the MongoDB database instance."""
    if db_instance.db is None:
        await init_db()
    return db_instance.db

async def close_db():
    """Close MongoDB connection."""
    if db_instance.client:
        db_instance.client.close()
        logger.info("MongoDB connection closed.")
