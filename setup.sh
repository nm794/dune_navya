#!/bin/bash

echo "🚀 Setting up Custom Form Builder with Live Analytics"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go 1.21+ first."
    exit 1
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB doesn't seem to be running. Please start MongoDB first."
    echo "   You can start it with: mongod"
fi

echo "✅ Prerequisites check completed"

# Setup Backend
echo ""
echo "🔧 Setting up Backend (Go Fiber API)..."
cd backend

# Initialize Go module and download dependencies
go mod tidy

echo "✅ Backend setup completed"

# Setup Frontend
echo ""
echo "🔧 Setting up Frontend (Next.js)..."
cd ../frontend

# Install npm dependencies
npm install

echo "✅ Frontend setup completed"

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "To run the application:"
echo ""
echo "1. Start the backend:"
echo "   cd backend && go run main.go"
echo ""
echo "2. In a new terminal, start the frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "3. Open your browser and go to:"
echo "   http://localhost:3000"
echo ""
echo "4. The backend API will be available at:"
echo "   http://localhost:8080"
echo ""
echo "Happy building! 🚀" 