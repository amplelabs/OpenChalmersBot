const defaultCity = {
    Toronto: {
        aliases: ['Toronto'],
        intersection: 'Yonge and Dundas or King Station.',
        greeting: `Hello my name is <b>Chalmers</b>, and I am what is known as a "chat-bot" ## I was designed by Ample Labs to help you find <b>free services</b> in the City of Toronto such as the following: ## Services may be impacted in response to COVID-19 (Coronavirus). <b>Please contact services prior to visiting in person</b> to receive up to date information on their service. For more information about COVID-19, <a href="https://covid-19.ontario.ca/" target="_blank">visit here.</a>`,
        lat: 43.6532,
        long: -79.3832,
        radius: 21,
        enabled: true,
        altShelter: true,
        altShelterMsg: `To reserve an overnight shelter bed, contact Central Intake at <a href='tel:416-338-4766'>416-338-4766</a>, which is available 24/7. ## <div id="covid-message"><img src="https://chalmers-assets.s3.amazonaws.com/alert-triangle.svg" width="18px" height="19px" id="covid-banner">COVID-19 Alert</div><br><span class='covid-alert'>Due to COVID-19, 129 Peter Street assessment centre is now closed.<br><br>📞 The only way to reserve a bed is by calling <a href='tel:416-338-4766' style='color:#FF0000;'>416-338-4766</a>.</span>`
    }
};
export default defaultCity;