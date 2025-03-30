const { requestPasswordReset, resetPassword } = require('../tunnel-ad-main/services/sanityAuthService');

const testPasswordReset = async () => {
  try {
    // Test email address
    const email = 'test@example.com';
    
    console.log(`Requesting password reset for: ${email}`);
    const resetResult = await requestPasswordReset(email);
    console.log('Reset request result:', resetResult);
    
    // In a real system, the user would receive an email with a link containing this token
    // This is just for testing purposes - normally you should never expose the token
    // We'd get the token from the database just for this test
    console.log('\nNote: In production, the token would be sent via email to the user');
    
    // Get token from db for this demo - in real app, user clicks link in email
    // This part is simulated - in production your Sanity would send an email
    
    // Simulate user using the reset token
    console.log('\nNow simulate a user using this token to reset their password:');
    // const token = '...token from reset request...';
    // const resetPasswordResult = await resetPassword(token, 'newPassword123');
    // console.log('Reset password result:', resetPasswordResult);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

testPasswordReset().then(() => console.log('Test completed')); 