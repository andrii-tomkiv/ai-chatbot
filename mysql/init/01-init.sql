-- Create database if not exists
CREATE DATABASE IF NOT EXISTS chatbot_db;
USE chatbot_db;

-- Create user if not exists and grant privileges
CREATE USER IF NOT EXISTS 'chatbot_user'@'%' IDENTIFIED BY 'chatbot_password';
GRANT ALL PRIVILEGES ON chatbot_db.* TO 'chatbot_user'@'%';
FLUSH PRIVILEGES; 