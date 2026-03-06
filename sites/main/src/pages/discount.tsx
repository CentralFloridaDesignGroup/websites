import { Button } from "@wps/input";

export function Discount() {
    const discountDetails = [
        {
            title: "First Responders",
            preamble: "We are proud to support those who serve our communities by offering exclusive discounts to first responders, including police officers, sheriff deputies, state troopers, firefighters, and EMTs.",
            offers: [
                { title: "Cost Discount", description: "Receive a 15% discount on all survey services as a token of our appreciation for your dedication and service." },
                { title: "Priority Scheduling", description: "Enjoy priority scheduling for your survey projects, ensuring that your needs are addressed promptly and efficiently." }
            ]
        },
        {
            title: "Teachers",
            preamble: "We recognize the invaluable contribution of educators in shaping the future and are pleased to offer special discounts to current K-12 and higher education teachers.",
            offers: [
                { title: "Cost Discount", description: "Receive a 10% discount on all survey services as a token of our appreciation for your dedication and service." },
                { title: "Priority Scheduling", description: "Enjoy priority scheduling for your survey projects, ensuring that your needs are addressed promptly and efficiently." }
            ]
        },
        {
            title: "Military Personnel",
            preamble: "We honor the dedication and service of military personnel by offering special discounts to active duty and retired members of the armed forces.",
            offers: [
                { title: "Cost Discount", description: "Receive a 20% discount on all survey services as a token of our appreciation for your dedication and service." },
                { title: "Priority Scheduling", description: "Enjoy priority scheduling for your survey projects, ensuring that your needs are addressed promptly and efficiently." }
            ]
        }
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold text-primary text-center">Active Service Discounts</h1>
            <p className="mt-4 text-lg text-gray-600 text-center">At White Point Surveying, we are proud to offer special discounts to honor the dedication and service of first responders, teachers, and active duty or retired military personnel. We appreciate and value the contribution each makes to our community and nation and are committed to providing them with exceptional survey services at a reduced cost.</p>
            <p className="bg-primary-200 border-l-2 border-primary p-2 mt-4"><strong>Important:</strong> Please note that we will need verification for any discount eligibility. Subject to approval.</p>
            {discountDetails.map((detail, index) => (
                <DiscountPage key={index} {...detail} />
            ))}
        </div>
    )
}

function DiscountPage({ title, preamble, offers }: { title: string; preamble: string; offers: { title: string; description: string }[] }) {
    return (
        <div className="px-6 py-2 my-4 text-center border-2 border-primary">
            <h3 className="text-xl font-semibold text-primary mb-2">{title}</h3>
            <p className="text-gray-700">{preamble}</p>
            {offers.map((offer, index) => (
                <p key={index} className="text-gray-500 mt-2">{offer.description}</p>
            ))}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <Button label="Contact Us" style="primary" size="medium" onClick={() => window.location.href = "/contact"} properties={{
                    classNames: "md:col-start-2"
                }}/>
                <Button label="See Applicable Services" style="secondary" size="medium" onClick={() => window.location.href = "/services"} properties={{
                    classNames: "md:col-start-3"
                }} />
            </div>
        </div>
    )
}