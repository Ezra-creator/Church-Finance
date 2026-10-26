import path from "path";

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(path.resolve(__dirname, "../.env"));
  } catch {
    // .env file not present or already loaded
  }
}
