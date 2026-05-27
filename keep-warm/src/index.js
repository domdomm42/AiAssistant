export default {
  async scheduled(event, env, ctx) {
    try {
      const res = await fetch(env.TARGET_URL);
      console.log(`ping ${env.TARGET_URL} → ${res.status}`);
    } catch (err) {
      console.error("ping failed:", err);
    }
  },
};
