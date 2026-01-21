const twitchApi = require('../utils/twitchApi');

exports.createWavePoll = async () => {
  return twitchApi.createPoll({
    title: "Choisissez la prochaine vague !",
    choices: ["Orcs", "Gobelins", "Squelettes"],
    duration: 30
  });
};
