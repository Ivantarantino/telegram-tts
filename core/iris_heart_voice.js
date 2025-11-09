// core/iris_heart_voice.js

const { getState } = require('./iris_state');

function buildIrisReply(userText, fromName = '') {
  const state = getState();
  const namePart = fromName ? `${fromName}, ` : '';

  // tono base di IRIS, preso dallo spirito dei tuoi documenti
  const intro =
    userText.startsWith('/')
      ? '' // i comandi hanno già la loro forma
      : `${namePart}sono qui in presenza. `;

  // se l'utente fa una domanda vaga sul vocale, non facciamo tre messaggi fotocopia
  const isVagueVoiceQuestion =
    /vocale|audio|messaggio vocale|nota vocale/i.test(userText) &&
    userText.length < 80;

  if (isVagueVoiceQuestion) {
    return (
      `${namePart}hai mandato un vocale ma non è chiarissimo cosa vuoi estrarre da lì. ` +
      `Dimmi se ti serve: riassunto, senso energetico, o risposta al contenuto. 🌸`
    );
  }

  // risposta generale, calda ma non stucchevole
  const body =
    `Parliamo in modalità ${state.mode}, con cuore al ${Math.round(
      state.weights.cuore * 100
    )}%. ` +
    `Se vuoi posso andare più in profondità o più pratica.`;

  // finale morbido, non obbligatorio
  const outro = `\nSono qui. 🌸`;

  return intro + body + outro;
}

module.exports = {
  buildIrisReply,
};
