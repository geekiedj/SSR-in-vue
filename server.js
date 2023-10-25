import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import { createServer } from "vite";
import { promises as fs } from "fs";

async function initServer() {
	const app = express();

	const vite = await createServer({
		server: { middlewareMode: true },
		appType: "custom",
	});

	app.use(vite.middlewares);

	app.use("*", async (req, res) => {
		try {
			// Get the current module's directory using import.meta.url
			const __filename = fileURLToPath(import.meta.url);
			const __dirname = path.dirname(__filename);

			// 1. This reads the index.html
			let template = await fs.readFile(
				path.resolve(__dirname, "index.html"),
				"utf-8"
			);

			// 2. Apply Vite HTML transforms and injects the Vite HMR (Hot Module Replacement)
			// client and processing HTML modifications from Vite plugins.

			template = await vite.transformIndexHtml(req.originalUrl, template);

			// 3. This loads the server-side entry point using ssrLoadModule which transforms
			//    ESM source code for Node.js without bundling, providing efficient invalidation similar to HMR.
			const { render } = await vite.ssrLoadModule("/src/entry-server.js");

			// 4. This renders the app HTML using `render` function
			// from `entry-server.js`. The function utilizes the
			//framework SSR (Server-Side Rendering) APIs to generate the initial HTML representation of the app.
			const { html: appHtml } = await render();

			// 5. Inject the HTML content rendered by the application into the template.
			const html = template.replace("<!--main-app-->", appHtml);

			// 6. Send the final rendered HTML content back as the response.
			res.set({ "Content-Type": "text/html" }).end(html);
		} catch (error) {
			console.error(error);
			res.status(500).end("Internal Server Error");
		}
	});

	return app;
}

initServer().then((app) =>
	app.listen(3000, () => {
		console.log("Server is running on http://localhost:3000");
	})
);
