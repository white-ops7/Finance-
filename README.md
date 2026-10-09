```markdown
# Personal Finance Tracker 

A full-featured, modern personal finance tracking application built with React. Track your income, expenses, visualize spending patterns, and manage your budget with an elegant interface.

##  Features

### Core Functionality
- **Transaction Management**: Add, view, and delete income/expense transactions
- **Category Organization**: Organize transactions by predefined categories
- **Budget Tracking**: Set and monitor monthly budget with visual progress indicator
- **Data Persistence**: All data saved locally in browser storage
- **Filtering**: Filter transactions by type (All/Income/Expenses)

### Analytics & Visualization
- **Pie Chart**: Visual breakdown of expenses by category
- **Bar Chart**: Monthly income vs expenses comparison (last 6 months)
- **Summary Cards**: Quick view of total income, expenses, balance, and budget status

### UI/UX Features
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Modern Interface**: Clean, intuitive design with smooth transitions
- **Color-Coded**: Green for income, red for expenses, visual feedback throughout

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository or create a new React app:
```bash
npx create-react-app finance-tracker
cd finance-tracker
```

2. Install dependencies:
```bash
npm install recharts lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init
```

3. Copy all the files from the structure above into your project

4. Start the development server:
```bash
npm start
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
finance-tracker/
├── src/
│   ├── components/          # React components
│   │   ├── Dashboard.jsx    # Summary cards and budget tracker
│   │   ├── TransactionForm.jsx  # Add new transactions
│   │   ├── TransactionList.jsx  # List of all transactions
│   │   ├── Charts.jsx       # Pie and bar charts
│   │   └── Header.jsx       # App header with theme toggle
│   ├── context/            # React Context for state management
│   │   ├── ThemeContext.jsx    # Dark/light theme state
│   │   └── FinanceContext.jsx  # Financial data state
│   ├── utils/              # Utility functions
│   │   ├── storage.js      # LocalStorage helpers
│   │   └── constants.js    # App constants
│   ├── App.jsx             # Main app component
│   ├── App.css             # Global styles
│   └── index.js            # App entry point
├── public/
│   └── index.html
├── package.json
├── tailwind.config.js
└── README.md
```

##  Technology Stack

- **React 18**: Modern React with hooks
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Composable charting library
- **Lucide React**: Beautiful icon library
- **Context API**: State management
- **LocalStorage**: Data persistence

## Usage Guide

### Adding Transactions
1. Click "Expense" or "Income" button to select type
2. Enter the amount
3. Select a category
4. Add optional description
5. Choose the date
6. Click "Add Transaction"

### Setting Budget
- Click on the budget amount in the Monthly Budget card
- Enter your desired monthly budget
- Press Enter or click outside to save

### Using Dark Mode
- Click the sun/moon icon in the top-right corner
- Theme preference is saved automatically

### Filtering Transactions
- Use the "All", "Income", or "Expenses" buttons above the transaction list
- View specific types of transactions

##  Customization

### Adding New Categories
Edit `src/utils/constants.js`:
```javascript
export const CATEGORIES = {
  expense: ['Food', 'Transportation', 'Your Category', ...],
  income: ['Salary', 'Your Income Type', ...]
};
```

### Changing Chart Colors
Edit `src/utils/constants.js`:
```javascript
export const CHART_COLORS = ['#color1', '#color2', ...];
```

### Modifying Default Budget
Edit `src/utils/constants.js`:
```javascript
export const DEFAULT_BUDGET = 5000; // Change to your desired amount
```

##  Features in Detail

### Budget Warning System
- **Green**: Less than 80% of budget used
- **Yellow**: 80-100% of budget used
- **Red**: Over budget

### Data Persistence
All data is stored in browser's localStorage:
- Transactions
- Monthly budget
- Theme preference

### Responsive Design
- Mobile: Single column layout
- Tablet: 2-column grid
- Desktop: Full 3-4 column layout

##  Contributing

Feel free to fork this project and add your own features! Some ideas:
- Export data to CSV/PDF
- Multiple currency support
- Recurring transactions
- Category customization
- Advanced filtering and search
- Data backup/restore

##  License

This project is open source and available under the MIT License.

##  Known Issues

- Data is stored locally (not synced across devices)
- No authentication system
- Limited to browser storage capacity

##  Future Enhancements

- [ ] Cloud sync
- [ ] Multi-user support
- [ ] Bill reminders
- [ ] Investment tracking
- [ ] Tax calculations
- [ ] Receipt uploads
- [ ] Savings goals
- [ ] Custom categories

## 📞 Support

If you have any questions or run into issues, please open an issue on GitHub.

---

Made using React & Tailwind CSS
```

##  Quick Setup Instructions

### Step 1: Create React App
```bash
npx create-react-app finance-tracker
cd finance-tracker
```

### Step 2: Install Dependencies
```bash
npm install recharts lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Step 3: Setup Tailwind
Create `postcss.config.js`:
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Step 4: Copy Files
Copy all the files from sections 1-15 above into their respective directories.

### Step 5: Run
```bash
npm start
```

##  Complete Package.json Scripts
```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
```

---