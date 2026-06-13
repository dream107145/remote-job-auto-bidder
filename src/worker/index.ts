import { startBidWorker } from "@/lib/queue/bid-queue";

console.log("Starting bid processing worker...");
startBidWorker();
console.log("Worker is running. Press Ctrl+C to stop.");

process.on("SIGTERM", () => {
  console.log("Shutting down worker...");
  process.exit(0);
});
