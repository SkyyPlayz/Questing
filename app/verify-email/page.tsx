export default function VerifyEmailPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold mb-4">Verifying your email...</h1>
      <p className="text-gray-500 mb-8">Please wait while we verify your email address.</p>
      <div id="verify-status" className="text-lg font-medium"></div>
      <script dangerouslySetInnerHTML={{
        __html: `
          const params = new URLSearchParams(window.location.search);
          const token = params.get('token');
          const email = params.get('email');
          if (!token || !email) {
            document.getElementById('verify-status').innerHTML = '<span style="color: red;">✗ Missing verification token</span>';
          } else {
            fetch('/api/auth/verify-email?token=' + token + '&email=' + encodeURIComponent(email))
              .then(r => r.json())
              .then(data => {
                const el = document.getElementById('verify-status');
                if (data.verified) {
                  el.innerHTML = '<span style="color: green;">✓ Email verified! Redirecting to login...</span>';
                  setTimeout(() => window.location.href = '/login', 2000);
                } else {
                  el.innerHTML = '<span style="color: red;">✗ Verification failed: ' + (data.error || 'unknown error') + '</span>';
                }
              })
              .catch(err => {
                document.getElementById('verify-status').innerHTML = '<span style="color: red;">✗ Verification error</span>';
              });
          }
        `
      }} />
    </div>
  );
}
