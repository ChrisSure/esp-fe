# ESP Frontend

A modern Angular application with comprehensive development tooling.

## 🚀 Features

- **Angular 20.3** - Latest Angular framework
- **TypeScript 5.9** - Strong typing support
- **SCSS** - Enhanced styling with Sass
- **ESLint** - Code linting and quality checks
- **Prettier** - Code formatting
- **Jest** - Modern JavaScript testing framework
- **GitHub Actions** - CI/CD pipeline
- **Husky** - Git hooks for code quality

## 📋 Prerequisites

- Node.js 20.x or 22.x
- npm 9.x or higher

## 🛠️ Development Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start development server:**

   ```bash
   npm start
   # or
   npm run start
   ```

3. **Open your browser:**
   Navigate to `http://localhost:4200`

## 🔧 Available Scripts

### Development

- `npm start` - Start development server
- `npm run build` - Build for development
- `npm run build:prod` - Build for production
- `npm run watch` - Build and watch for changes

### Code Quality

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run format:staged` - Format staged files only

### Testing

- `npm test` - Run tests with Jest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ci` - Run tests once (for CI)
- `npm run test:coverage` - Run tests with coverage report

## 🏗️ Project Structure

```
src/
├── app/                 # Application components
│   ├── app.config.ts   # Application configuration
│   ├── app.routes.ts   # Routing configuration
│   ├── app.ts          # Root component
│   └── ...
├── assets/             # Static assets
├── index.html          # Main HTML file
├── main.ts             # Application entry point
└── styles.scss         # Global styles
```

## 🔍 Code Quality

### ESLint Configuration

- Angular-specific rules
- TypeScript best practices
- Template accessibility checks
- Custom rules for consistent code style

### Prettier Configuration

- 100 character line width
- Single quotes for strings
- Trailing commas (ES5)
- Angular template formatting

### Pre-commit Hooks

Automatically runs on each commit:

- Code formatting check
- Linting
- Unit tests

## 🚦 CI/CD Pipeline

GitHub Actions workflow includes:

- **Multi-version testing** (Node.js 20.x, 22.x)
- **Code quality checks** (linting, formatting)
- **Unit tests** with coverage
- **Build verification**
- **Artifact upload**

### Workflow Triggers

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

## 🧪 Testing

The project uses Jest for unit testing:

- **Test files:** `*.spec.ts`
- **Configuration:** `jest.config.js`
- **Setup:** `setup-jest.ts`
- **Coverage reports:** Generated in `coverage/` directory

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (development)
npm run test:watch

# Single run (CI)
npm run test:ci

# With coverage
npm run test:coverage
```

### Jest Configuration

- **Zone.js setup** for Angular testing
- **TypeScript support** with ts-jest
- **Coverage collection** from `src/**/*.ts` files
- **Mock DOM environment** with jsdom
- **Angular-specific transformations** for components and templates

## 🔧 VS Code Setup

The project includes VS Code configuration:

- **Recommended extensions** (`.vscode/extensions.json`)
- **Debug configuration** (`.vscode/launch.json`)
- **Task definitions** (`.vscode/tasks.json`)

## 📝 Git Workflow

1. **Feature development:**

   ```bash
   git checkout -b feature/your-feature-name
   # Make your changes
   git add .
   git commit -m "feat: your feature description"
   ```

2. **Pre-commit hooks will automatically:**
   - Format your code
   - Run linting checks
   - Execute unit tests

3. **Push and create pull request:**
   ```bash
   git push origin feature/your-feature-name
   ```

## 🛡️ Code Quality Standards

- **ESLint:** Enforces consistent code style and catches potential errors
- **Prettier:** Maintains consistent code formatting
- **TypeScript:** Provides static type checking
- **Unit Tests:** Ensures code reliability and prevents regressions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all checks pass:
   ```bash
   npm run lint
   npm run format:check
   npm run test:ci
   npm run build
   ```
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
