CREATE USER IF NOT EXISTS 'doupi_test'@'localhost' IDENTIFIED BY 'DoupiTest2026!#';
GRANT ALL PRIVILEGES ON `stuck-mg-test`.* TO 'doupi_test'@'localhost';
FLUSH PRIVILEGES;
