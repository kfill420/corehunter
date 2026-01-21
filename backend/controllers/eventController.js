exports.testEvent = async (req, reply) => {
  reply.send({ ok: true, message: "Event OK" });
};
