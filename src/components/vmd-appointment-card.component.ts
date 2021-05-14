import {
    css,
    customElement,
    html,
    LitElement,
    property,
    PropertyValues, query,
    unsafeCSS
} from 'lit-element';
import {classMap} from "lit-html/directives/class-map";
import {
    Lieu,
    LieuAffichableAvecDistance,
    Plateforme,
    PLATEFORMES,
    typeActionPour,
    TYPES_LIEUX
} from "../state/State";
import {Router} from "../routing/Router";
import {Dates} from "../utils/Dates";
import appointmentCardCss from "./vmd-appointment-card.component.scss";
import {Strings} from "../utils/Strings";
import {TemplateResult} from "lit-html";
import {CSS_Global} from "../styles/ConstructibleStyleSheets";
import tippy from "tippy.js";

type LieuCliqueContext = {lieu: Lieu};
export type LieuCliqueCustomEvent = CustomEvent<LieuCliqueContext>;

@customElement('vmd-appointment-card')
export class VmdAppointmentCardComponent extends LitElement {

    //language=css
    static styles = [
        CSS_Global,
        css`${unsafeCSS(appointmentCardCss)}`,
        css`
        `
    ];

    @property({type: Object, attribute: false}) lieu!: LieuAffichableAvecDistance;
    @property({type: String}) theme!: string;
    @property() highlightable!: boolean;

    @query("#chronodose-label") $chronodoseLabel!: HTMLSpanElement;

    constructor() {
        super();
    }

    prendreRdv() {
        this.dispatchEvent(new CustomEvent<LieuCliqueContext>('prise-rdv-cliquee', {
            detail: { lieu: this.lieu }
        }));
    }

    verifierRdv() {
        this.dispatchEvent(new CustomEvent<LieuCliqueContext>('verification-rdv-cliquee', {
            detail: { lieu: this.lieu }
        }));
    }

    render() {
            const plateforme: Plateforme|undefined = PLATEFORMES[this.lieu.plateforme];
            let distance: string|undefined;
            if (this.lieu.distance && this.lieu.distance >= 10) {
              distance = this.lieu.distance.toFixed(0)
            } else if (this.lieu.distance) {
              distance = this.lieu.distance.toFixed(1)
            }

            let cardConfig: {
                highlighted: boolean
                cardLink:(content: TemplateResult) => TemplateResult,
                estCliquable: boolean, disabledBG: boolean,
                actions: TemplateResult|undefined, libelleDateAbsente: string
            };
            let typeLieu = typeActionPour(this.lieu);
            if(typeLieu === 'actif-via-plateforme' || typeLieu === 'inactif-via-plateforme') {
                let specificCardConfig: { disabledBG: boolean, libelleDateAbsente: string, libelleBouton: string, typeBouton: 'btn-info'|'btn-primary', onclick: ()=>void };
                if(typeLieu === 'inactif-via-plateforme') {
                    specificCardConfig = {
                        disabledBG: true,
                        libelleDateAbsente: 'Aucun rendez-vous',
                        libelleBouton: 'Vérifier le centre de vaccination',
                        typeBouton: 'btn-info',
                        onclick: () => this.verifierRdv()
                    };
                } else {
                    specificCardConfig = {
                        disabledBG: false,
                        libelleDateAbsente: 'Date inconnue',
                        libelleBouton: 'Prendre rendez-vous',
                        typeBouton: 'btn-primary',
                        onclick: () => this.prendreRdv()
                    };
                }

                cardConfig = {
                    highlighted: this.highlightable && !specificCardConfig.disabledBG,
                    estCliquable: true,
                    disabledBG: specificCardConfig.disabledBG,
                    libelleDateAbsente: specificCardConfig.libelleDateAbsente,
                    cardLink: (content) =>
                        html`<a href="#" @click="${(e: Event) => { specificCardConfig.onclick(); e.preventDefault(); } }">${content}</a>`,
                    actions: html`
                      <a href="#" @click="${(e: Event) => e.preventDefault()}" 
                         class="btn btn-lg ${classMap({ 'btn-primary': specificCardConfig.typeBouton==='btn-primary', 'btn-info': specificCardConfig.typeBouton==='btn-info' })}">
                        ${specificCardConfig.libelleBouton}
                      </a>
                      <div class="row align-items-center justify-content-center mt-3 text-black-50">
                        <div class="col-auto">
                          ${this.lieu.appointment_count.toLocaleString()} créneau${Strings.plural(this.lieu.appointment_count, "x")}
                        </div>
                        ${this.lieu.plateforme?html`
                        |
                        <div class="col-auto">
                            ${plateforme?html`
                            <img class="rdvPlatformLogo ${plateforme.styleCode}" src="${Router.basePath}assets/images/png/${plateforme.logo}" alt="Créneau de vaccination ${plateforme.nom}">
                            `:html`
                            ${this.lieu.plateforme}
                            `}
                        </div>
                        `:html``}
                      </div>
                    `
                };
            } else if(typeLieu === 'actif-via-tel') {
                cardConfig = {
                    highlighted: false,
                    estCliquable: true,
                    disabledBG: false,
                    libelleDateAbsente: 'Réservation tél uniquement',
                    cardLink: (content) => html`
                          <a href="tel:${this.lieu.metadata.phone_number}">
                            ${content}
                          </a>`,
                    actions: html`
                          <a href="tel:${this.lieu.metadata.phone_number}" class="btn btn-tel btn-lg">
                            Appeler le ${Strings.toNormalizedPhoneNumber(this.lieu.metadata.phone_number)}
                          </a>
                        `
                };
            } else if(typeLieu === 'inactif') {
                cardConfig = {
                    highlighted: false,
                    estCliquable: false,
                    disabledBG: true,
                    libelleDateAbsente: 'Aucun rendez-vous',
                    cardLink: (content) => content,
                    actions: undefined
                };
            } else {
                throw new Error(`Unsupported typeLieu : ${typeLieu}`)
            }

            return cardConfig.cardLink(html`
            <div class="card rounded-3 mb-5  ${classMap({
              highlighted: cardConfig.highlighted, clickable: cardConfig.estCliquable, 
              'bg-disabled': cardConfig.disabledBG,
              'search-standard': this.theme==='standard',
              'search-chronodose': this.theme==='chronodose'
                })}"
                 title="${cardConfig.estCliquable ? this.lieu.url : ''}">
                ${cardConfig.highlighted?html`
                <div class="row align-items-center highlight-text">
                  <span id="chronodose-label" title="Les chronodoses sont des doses de vaccin réservables à court terme sans critères d'éligibilité"><i class="bi vmdicon-lightning-charge-fill"></i>Chronodoses disponibles<i class="bi vmdicon-lightning-charge-fill"></i></span>
                </div>`:html``}
                <div class="card-body p-4">
                    <div class="row align-items-center ">
                        <div class="col">
                            <h5 class="card-title">
                              ${this.lieu.prochain_rdv?Dates.isoToFRDatetime(this.lieu.prochain_rdv):cardConfig.libelleDateAbsente}
                              <small class="distance">${distance ? `- ${distance} km` : ''}</small>
                            </h5>
                            <div class="row">
                              <vmd-appointment-metadata class="mb-2" widthType="full-width" icon="vmdicon-geo-alt-fill" label="Adresse">
                                <div>
                                  <span class="fw-bold text-dark">${this.lieu.nom}</span>
                                  <br/>
                                  <em>${this.lieu.metadata.address}</em>
                                </div>
                              </vmd-appointment-metadata>
                              ${!!this.lieu.metadata.phone_number ? html`
                                <vmd-appointment-metadata class="mb-2" widthType="fit-to-content" icon="vmdicon-telephone-fill" label="Téléphone">
                                  <span>
                                      <a href="tel:${this.lieu.metadata.phone_number}"
                                        @click="${(e: Event) => { e.stopImmediatePropagation(); }}">
                                          ${Strings.toNormalizedPhoneNumber(this.lieu.metadata.phone_number)}
                                      </a>
                                  </span>
                                </vmd-appointment-metadata>
                              ` : ''} 
                              <vmd-appointment-metadata class="mb-2" widthType="fit-to-content" icon="vmdicon-commerical-building" label="Lieux">
                                <span>${TYPES_LIEUX[this.lieu.type]}</span>
                              </vmd-appointment-metadata>
                              ${!!this.lieu.vaccine_type ? html`
                                <vmd-appointment-metadata class="mb-2" widthType="fit-to-content" icon="vmdicon-syringe" label="Vaccin administré">
                                  <span>${this.lieu.vaccine_type}</span>
                                </vmd-appointment-metadata>
                              ` : ''}
                            </div>
                        </div>

                        ${cardConfig.actions?html`
                        <div class="col-24 col-md-auto text-center mt-4 mt-md-0">
                          ${cardConfig.actions}
                        </div>
                        `:html``}
                    </div>
                </div>
            </div>
            `);
    }

    updated(changedProperties: PropertyValues) {
        super.updated(changedProperties);
        tippy(this.$chronodoseLabel, {
            content: (el) => el.getAttribute('title')!
        })
    }

    connectedCallback() {
        super.connectedCallback();
        // console.log("connected callback")
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        // console.log("disconnected callback")
    }
}
