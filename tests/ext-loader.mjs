// Lets bare `node` resolve the project's extensionless relative imports,
// the same way webpack does.
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (err) {
    if (specifier.startsWith(".")) {
      for (const ext of [".js", ".jsx", "/index.js"]) {
        try { return await next(specifier + ext, context); } catch { /* try next */ }
      }
    }
    throw err;
  }
}
