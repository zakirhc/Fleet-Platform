export default () => ({
    app: {
      name: 'Fleet Platform',
  
      version: '1.0.0',
  
      timezone: 'Asia/Dhaka',
    },
  
    jwt: {
      expiresIn: '15m',
  
      refreshExpiresIn: '7d',
    },
  });