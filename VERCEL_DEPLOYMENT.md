# Vercel browser deployment

Ghost City RLT can host its dashboard and browser UI on Vercel, but the Electron build remains the complete local workflow for now. Browser sessions cannot directly access the user's EA save folder or launch local mod tooling.

The planned browser workflow is:

1. Upload a save from the browser to object storage.
2. Process it with a dedicated worker/container that has the native save parser and embedded mod resources.
3. Store the result temporarily and provide a download link.
4. Keep the existing Electron app for direct local save-folder access.

Do not deploy the current local SQLite/native-mod routes as ordinary Vercel serverless functions without a separate storage and worker design. Save processing can exceed request-size, bundle-size, duration, or native-module constraints.
