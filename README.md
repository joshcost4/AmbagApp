
  # Group Budget & Expense Splitter UI

  This is a code bundle for Group Budget & Expense Splitter UI. The original project is available at https://www.figma.com/design/uwejUVxPxd9OaCFBdgN9rO/Group-Budget---Expense-Splitter-UI.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  Run `npm run build` to create the production build in `dist`.

  To deploy on Vercel:
  1. Run `npm install` to make sure dependencies are installed.
  2. Run `npm run build` to produce the `dist` folder.
  3. Run `npm run deploy` to deploy the app using the local Vercel CLI.

  If you want to install the Vercel CLI globally instead, run `npm install -g vercel` and then use `vercel`.

  Important: do not run `npm run build vercel` — that passes `vercel` as an argument to Vite and is not correct.

  Once deployed, your app will be available from a public URL and can be opened as a PWA on mobile devices.

  If you want to use the app from another device on the same network, open the URL shown under "Network" in the terminal (for example `http://192.168.x.x:5174`).

  For offline/home-screen use on mobile, install the app as a PWA from the browser and make sure the service worker is registered successfully. If you want the app to remain available after the laptop is shut down, deploy the built app from `npm run build` to a static host such as GitHub Pages, Vercel, or Netlify.
  