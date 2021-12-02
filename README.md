# KellyC-Return-YouTube-Dislikes

Show dislikes on Youtube

Youtube has removed dislike statistics. This extension return this functionality back.

My project is similar to other ones, but with some features that was important personaly for me :

- Classic ratio bar with green \ red colors
- Optional customisation of colors for ratio bar
- Support different sources of data so user can clearly see where "likes\dislikes" information was loaded from
- Support of mobile devices

Used combination of API access and restore data by rating metrica data.

Default requests order -> [page data rating meta data] -> [API driver] (can be replaced in extra settings)

<h2> Install </h2>

<p>
<b> Install </b> for <a href="https://chrome.google.com/webstore/detail/kellyc-return-youtube-dis/gmdihkflccbodfkfioifolcijgahdgaf?hl=en">Chrome</a>,
 <a href="https://addons.mozilla.org/en/firefox/addon/return-youtube-dislike/">FireFox</a>
</p>

- Edge, Opera and any that allow install extensions from Chrome Extensions Store
- a bit tested on mobile devices as well (for ex. Kiwi Browser supports extensions)


# APIs used

- API by <a href="https://returnyoutubedislike.com/">Return YouTube Dislikes</a> project as alternative channel (WIP)<br>
- API by <a href="https://sponsor.ajay.app/">SponsorBlock</a> (WIP)<br>
- catface.ru used as cache from YouTube API \ metric data. It's not store all data constantly.

If YouTube completely closes all metadata, planning to give choice of which data source will be used for load data.

Feel free to suggest any other solutions (open databases \ metrics etc.)