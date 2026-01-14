# CSC450 Stack:
- RN,
- AWS EC2 and S3,
- Postgres,
- RN Firebase Auth (Custom non-hosted UI),
- Nest,
- TS

# Premise:
- Split bill by image capture [capture the bill amount] with text input fallback. 
- Select from "friends" list and then select the platform by logo from the dropdown on the card.
- Even split option vs custom split option [slider or text box?].
## Research how we can send requests to each major service to request funds. WE DO NOT HANDLE THE MONEY.
- Use Apple Push Notifications if recipient also has our app installed, send a notification that if clicked opens the request in the specific app.
- Otherwise fall back to Twilio's SMS since AWS SNS registration is unneeded for this scope.
- Introduce a past bills ledger with the split for each individual as history.
- Thinking some sort of green-based theme/style.
- OPTIONAL: Your year in spending and/or distribution graph by individual (Just some basic queries but could be cool).
- Ability to form "groups" of friends.
- Ability to toggle a preference platform.
- Light/Dark themes + follow accessibility guidelines.
- Use the devices' location settings to grab the business at where the transaction occurred (OPTIONAL with user consent).
- Persist login states.
- Capture (maybe email?)/phone number on initial account creation.
- Profile image stored in S3, use pre-signed URLS generated in the backend.
- Input validation on all input boxes and sanitize any data before it reaches the backend.
- Ability to favorite friends and search through friends list.
- Friend request/accept/suggest interface based off of your Venmo/PayPal/etc... friends. Similar to add contacts in other apps. Also pull contact data in.



## IF NOT ENOUGH FEATURES:
Save restaurant data globally and by user, allow reviews or ratings of restaurants available on a yelp-like "community page" but bill split is primary feature.


