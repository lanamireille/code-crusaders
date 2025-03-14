export default {
  preset: 'js-jest',
  testEnvironment: 'node',
  maxWorkers: 1,

  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  }
};
