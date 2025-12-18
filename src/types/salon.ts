export interface SalonConfig {
    salon_id: string;
    brand: {
        name: string;
        logo_url: string;
        primary_color: string;
        secondary_color: string;
        background_color: string;
    };
    texts: {
        book_button: string;
        cancel_button: string;
        admin_title: string;
    };
    features: {
        online_payment: boolean;
        promo_codes: boolean;
        reviews: boolean;
        extra_button: {
            enabled: boolean;
            text: string;
            url: string;
        };
    };
    contacts: {
        phone: string;
        address: string;
        instagram: string;
    };
    timezone: string;
}
