# GPS Map App

A responsive, mobile-friendly React application that displays a GPS-based interactive map using Leaflet.js. The app automatically detects and centers on the user's current GPS location, displays a marker on their live location, and refreshes the position every 10 seconds.

## Features

- Real-time GPS location tracking
- Full-screen interactive map
- Toggleable navigation sidebar
- Dark mode support
- Mobile-friendly responsive design
- Optimized for embedding via iframe

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/gps-map-app.git
   cd gps-map-app
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in your browser

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Deploying to Vercel

### Option 1: Using Vercel CLI

1. Install Vercel CLI
   ```bash
   npm install -g vercel
   ```

2. Deploy to Vercel
   ```bash
   vercel
   ```

3. Follow the prompts to complete the deployment

### Option 2: Using Vercel Dashboard

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Visit [vercel.com](https://vercel.com) and sign in

3. Click "New Project" and import your repository

4. Configure the project settings:
   - Framework Preset: Create React App
   - Build Command: `npm run build`
   - Output Directory: `build`

5. Click "Deploy"

## Embedding via iframe

Once deployed to Vercel, you can embed the app in any website using an iframe:

```html
<iframe 
  src="https://your-vercel-deployment-url.vercel.app" 
  width="100%" 
  height="500" 
  style="border: none; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" 
  allowfullscreen="true" 
  loading="lazy">
</iframe>
```

Replace `your-vercel-deployment-url.vercel.app` with your actual Vercel deployment URL.

## Customization

- **Map Provider**: The app uses OpenStreetMap by default. You can change the tile provider in `App.jsx` by modifying the `TileLayer` URL.
- **Update Interval**: The position refresh interval is set to 10 seconds. You can adjust this in the `LocationMarker` component.
- **Styling**: The app uses TailwindCSS for styling. You can customize the appearance by modifying the classes in the components.

## License

MIT
