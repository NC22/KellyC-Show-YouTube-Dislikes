# KellyC-Return-YouTube-Dislikes

<img src="https://catface.ru/userfiles/media/udata_1638497616_xequqlxf.png">

Show dislikes on Youtube

Youtube has removed dislike statistics. This extension return this functionality back.

My project is similar to other ones, but with some features that was important personaly for me :

- Classic ratio bar with green \ red colors
- Optional customisation of colors for ratio bar
- Support select of dislikes data providers, so user can clearly see where "likes\dislikes" information was loaded from (currently IN DEV versions only)
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


# Dislikes providers used

- API by <a href="https://returnyoutubedislike.com/">Return YouTube Dislikes</a> project as alternative channel (in dev builds > 1.1.1.6)<br>
- API by <a href="https://sponsor.ajay.app/">SponsorBlock</a> (in dev builds > 1.1.1.6)<br>
- <a href="https://catface.ru">Catface.ru</a> used as cache from YouTube API \ metric data. It's not store all data constantly.

If YouTube completely closes all metadata, planning to give choice of which data source will be used for load data.

Feel free to suggest any other solutions (open databases \ metrics etc.)

# Screenshots

Data providers configuration manager

<img src="https://catface.ru/userfiles/media/udata_1638497609_cwdmlwgu.png">

<img src="https://catface.ru/userfiles/media/udata_1638497612_sruftcdp.png">

