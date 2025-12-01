
try {
  if (typeof fetch === 'function') {
    console.log('fetch is available');
  } else {
    console.log('fetch is NOT available');
  }
} catch (e) {
  console.log('Error checking fetch:', e);
}
