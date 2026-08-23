-- Adds a generic actionUrl column to notifications so every notification can
-- deep-link straight to the specific record it concerns (leave request, form
-- instance, course assignment, disciplinary case, employee record, etc.)
-- instead of only ever landing on a generic list page. Nullable — existing
-- rows keep resolving via the client's type-based fallback in
-- resolveNotificationHref.
ALTER TABLE "notifications" ADD COLUMN "actionUrl" TEXT;
