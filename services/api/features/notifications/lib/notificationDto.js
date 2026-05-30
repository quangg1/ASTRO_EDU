function notificationToClientDto(doc) {
  const d = doc?.toObject ? doc.toObject() : doc;
  if (!d) return null;
  return {
    id: String(d._id),
    type: d.type,
    titleVi: d.titleVi,
    bodyVi: d.bodyVi || '',
    href: d.href || null,
    readAt: d.readAt ? new Date(d.readAt).toISOString() : null,
    createdAt: new Date(d.createdAt).toISOString(),
    metadata: d.metadata || {},
  };
}

module.exports = { notificationToClientDto };
