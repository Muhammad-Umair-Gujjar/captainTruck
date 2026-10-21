-- Unique thread per trip + type (Phase 11)
CREATE UNIQUE INDEX "chat_threads_tripId_type_key" ON "chat_threads"("tripId", "type");
