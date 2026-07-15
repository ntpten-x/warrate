// Polyfill process.version for compatibility with Node-specific libraries in the Edge runtime
if (typeof process !== "undefined" && !process.version) {
  try {
    Object.defineProperty(process, "version", {
      value: "v22.16.0",
      writable: true,
      configurable: true,
    });
  } catch (e) {
    try {
      // If process is a read-only Proxy or frozen (like in Next.js Edge Sandbox),
      // we shadow it by overriding globalThis.process with a prototype-linked object
      const originalProcess = process;
      const newProcess = Object.create(originalProcess);
      Object.defineProperty(newProcess, "version", {
        value: "v22.16.0",
        writable: true,
        configurable: true,
        enumerable: true,
      });
      globalThis.process = newProcess;
    } catch (err) {
      console.error("Failed to polyfill process.version:", err);
    }
  }
}
