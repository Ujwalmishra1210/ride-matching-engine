// using timers +map
const pendingOffers=new Map();

function waitForDriverResponse(driverId,timeoutMs=10000){

        return new Promise((resolve) => {
            
            const timer=setTimeout(()=>
                {
                 pendingOffers.delete(driverId);
                 resolve(false);
                },timeoutMs);

           pendingOffers.set(driverId,
            {
                resolve,
                timer
            }
           );

        });
}

function acceptOffer(driverId){
            
    const offer=pendingOffers.get(driverId);
    if(!offer){
        return;
    }
    clearTimeout(offer.timer);
    offer.resolve(true);
    pendingOffers.delete(driverId);

}

function rejectOffer(driverId){

    const offer=pendingOffers.get(driverId);
    if(!offer){
        return;
    }
    clearTimeout(offer.timer);
    offer.resolve(false);
    pendingOffers.delete(driverId);

}

module.exports={waitForDriverResponse,acceptOffer,rejectOffer};
