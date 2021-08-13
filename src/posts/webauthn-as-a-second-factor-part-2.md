---
title: WebAuthn as a Second Factor - Part 2
description: Part 2 of the WebAuthn as a Second factor posts.
author: Jarrett Helton
date: 2021-08-13T22:52:49.434Z
draft: false
tags:
  - webauthn
  - cryptography
  - programming
  - javascript
---
![WebAuthn Fido](/static/img/webauthn-fido2.png "WebAuthn Fido")

This is part two of the WebAuthn as a Second Factor post. 

Be sure to read [part one](https://jarretthelton.dev/posts/webauthn-as-a-second-factor-part-1/) before starting here.
		

### WebAuthn Assertions

If a user with a registered device attempts to login with a username and password, they will be redirected to the WebAuthn Assertion page.
		
The page for assertions is very similar to attestation. First, we generate our options back on the client and start the assertion with WebAuthn using SimpleWebAuthn's `startAssertion` method. Once we have the response from the authenticator, we will send it to the server.
		

````
	`$ public/two-factor/webauthn/webauthn.js`
	```javascript
	 const resp = await fetch("/webauthn/generate-assertion-options");
	
	```
	

	Let's take a look at the assertion options we created on the server.
	

	`$ routes/webauthn.ts`
	```javascript
	 router.get("/generate-assertion-options", (req, res) => {
	 const user = database[req.cookies.user];
	
	 const options = generateAssertionOptions({
	 timeout: 60000,
	 userVerification: 'discouraged',
	 rpID,
	 allowCredentials: user?.devices.map((dev) => ({
	 id: dev.credentialID,
	 type: "public-key",
	 transports: ["usb", "ble", "nfc", "internal"],
	 })),
	 });
	
	 user!.currentChallenge = options.challenge;
	
	 res.send(options);
	 });
	```
	
	There are some similarities between these options and the ones generated for attestation. The new property is `allowedCredentials`. This property lets you decide which credentials are allowed for this particular authentication. For example, if a user had three devices but lost one of them, you could send the two credentials you know are available. If you have multiple WebAuthn compatible devices, the browser will prompt you to choose a device to perform authentication. This property can help shape that list.
	
	Next, we save the newest challenge on these users to verify the signature during verification.
	
	Once that returns to the client, we can begin assertion.
	
	`$ public/two-factor/webauthn/webauthn.js`
	```javascript
	 const asseResp = await startAssertion(opts);
	
	 const verificationResp = await fetch("/webauthn/verify-assertion", {
	 method: "POST",
	 headers: {
	 "Content-Type": "application/json",
	 },
	 body: JSON.stringify(asseResp),
	 });
	
	 return verificationResp.json();
	 ```
	
	The `startAssertion` response is sent to the server's assertion-verification endpoint.
	
	Like with attestation, we have to query for the saved challenge. Then we provide all of the expected values for the challenge, relying party, and client's origin.
	
	```javascript
	 const expectedChallenge = user.currentChallenge;
	
	 let dbAuthenticator;
	 const bodyCredIDBuffer = base64url.toBuffer(body.rawId);
	
	 for (const dev of user.devices) {
	 if (dev.credentialID.equals(bodyCredIDBuffer)) {
	 dbAuthenticator = dev;
	 break;
	 }
	 }
	
	 if (!dbAuthenticator) {
	 throw new Error(`could not find authenticator matching ${body.id}`);
	 }
	
	 let verification;
	 try {
	 verification = verifyAssertionResponse({
	 credential: body,
	 expectedChallenge: `${expectedChallenge}`,
	 expectedOrigin,
	 expectedRPID: rpID,
	 authenticator: dbAuthenticator,
	 });
	 } catch (error) {
	 console.error(error);
	 return res.status(400).send({ error: error.message });
	 }
	
	```
	 
	 The new parameter, `authenticator`, is a SimpleWebAuthn interface representing the credential-specific data we saved during attestation. This object must contain the `credentialPublicKey`, the `credentialId`, and the `counter`. SimpleWebAuthn validates the signature, the expectations, and the counter. 
	 
	Within our `verification` response, we have two _very_ important properties - `verified` and `assertionInfo`. `verified` will tell us if the assertion was successful. First, we must check that verifed value is true.
````

Next, `assertionInfo` contains the `newCounter` that we must use to update our data in the database. Incrementing the counter should be considered a requirement. The counter of an authenticator is crucial to preventing authenticator cloning and replay attacks.
		 
		`javascript
		 const { verified, assertionInfo } = verification;
		
		 if (verified) {
		 dbAuthenticator.counter = assertionInfo.newCounter;
		 user.loggedIn = true;
		 res.send({ verified })
		 } else {
		 res.status(401).send('unauthorized');
		 };
		});`
		
		If all goes well in the assertion, we will return our client's `verified` status.

### Conclusion

```
	We complete the 2FA login ceremony and route you back to the profile page to see the data with that response. Finally, we have successfully seen what it takes to implement WebAuthn using SimpleWebAuthn, and then using it as a second factor to meet the criteria of a multi-factor authentication system.
	
	While we covered many details, we have only scratched the surface of what WebAuthn is capable of. In the next SimpleWebAuthn post, we will see what it takes to remove passwords and make WebAuthn a primary means of authentication.
```