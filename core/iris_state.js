// core/iris_state.js

// stato centrale di IRIS
const irisState = {
  version: '5.0.8.0',
  mode: 'hy',            // hy | free | book
  lang: 'it',
  voice: 'openai:alloy',
  model: 'gpt-4o-mini',
  weights: {
    cuore: 0.6,
    anima: 0.25,
    visione: 0.15,
  },
  lastEcho: null,
};

function getState() {
  return { ...irisState };
}

function setState(partial = {}) {
  Object.assign(irisState, partial);
  if (partial.weights) {
    irisState.weights = { ...irisState.weights, ...partial.weights };
  }
}

function getVersion() {
  return irisState.version;
}

module.exports = {
  getState,
  setState,
  getVersion,
};
