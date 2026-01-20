import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { subscriptionApi } from '../api/subscription'
import type { AppInfo, AppConfig, LocalizedText } from '../types'

interface ConnectionModalProps {
  onClose: () => void
}

// Platform SVG Icons
const IosIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
)

const AndroidIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.463 11.463 0 00-8.94 0L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48A10.78 10.78 0 003 18h18a10.78 10.78 0 00-3.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/>
  </svg>
)

const WindowsIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z"/>
  </svg>
)

const MacosIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 4h16a2 2 0 012 2v10a2 2 0 01-2 2h-6v2h2a1 1 0 110 2H8a1 1 0 110-2h2v-2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v10h16V6H4z"/>
  </svg>
)

const LinuxIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C9.5 2 8 4.5 8 7c0 1.5.5 3 1 4-1.5 1-3 3-3 5 0 .5 0 1 .5 1.5-.5.5-1.5 1-1.5 2 0 1.5 2 2.5 4 2.5h6c2 0 4-1 4-2.5 0-1-1-1.5-1.5-2 .5-.5.5-1 .5-1.5 0-2-1.5-4-3-5 .5-1 1-2.5 1-4 0-2.5-1.5-5-4-5zm-2 5c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1zm4 0c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1zm-2 3c1 0 2 .5 2 1s-1 1-2 1-2-.5-2-1 1-1 2-1z"/>
  </svg>
)

const TvIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="13" rx="2" ry="2"/>
    <polyline points="8 21 12 17 16 21"/>
  </svg>
)

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
)

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

const LinkIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
)

const ChevronIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
)

// Platform icon components map
const platformIconComponents: Record<string, React.FC> = {
  ios: IosIcon,
  android: AndroidIcon,
  macos: MacosIcon,
  windows: WindowsIcon,
  linux: LinuxIcon,
  androidTV: TvIcon,
  appleTV: TvIcon,
}

// App icons
const HappIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 50 50" fill="currentColor">
    <path d="M22.3264 3H12.3611L9.44444 20.1525L21.3542 8.22034L22.3264 3Z"/>
    <path d="M10.9028 20.1525L22.8125 8.22034L20.8681 21.1469H28.4028L27.9167 21.6441L20.8681 28.8531H19.4097V30.5932L7.5 42.5254L10.9028 20.1525Z"/>
    <path d="M41.0417 8.22034L28.8889 20.1525L31.684 3H41.7708L41.0417 8.22034Z"/>
    <path d="M30.3472 20.1525L42.5 8.22034L38.6111 30.3446L26.9444 42.5254L29.0104 28.8531H22.3264L29.6181 21.1469H30.3472V20.1525Z"/>
    <path d="M40.0694 30.3446L28.4028 42.5254L27.9167 47H37.8819L40.0694 30.3446Z"/>
    <path d="M18.6806 47H8.47222L8.95833 42.5254L20.8681 30.5932L18.6806 47Z"/>
  </svg>
)

const ClashMetaIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 50 50" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M4.99239 5.21742C4.0328 5.32232 3.19446 5.43999 3.12928 5.47886C2.94374 5.58955 2.96432 33.4961 3.14997 33.6449C3.2266 33.7062 4.44146 34.002 5.84976 34.3022C7.94234 34.7483 8.60505 34.8481 9.47521 34.8481C10.3607 34.8481 10.5706 34.8154 10.7219 34.6541C10.8859 34.479 10.9066 33.7222 10.9338 26.9143L10.9638 19.3685L11.2759 19.1094C11.6656 18.7859 12.1188 18.7789 12.5285 19.0899C12.702 19.2216 14.319 20.624 16.1219 22.2061C17.9247 23.7883 19.5136 25.1104 19.6527 25.144C19.7919 25.1777 20.3714 25.105 20.9406 24.9825C22.6144 24.6221 23.3346 24.5424 24.9233 24.5421C26.4082 24.5417 27.8618 24.71 29.2219 25.0398C29.6074 25.1333 30.0523 25.1784 30.2107 25.1399C30.369 25.1016 31.1086 24.5336 31.8543 23.8777C33.3462 22.5653 33.6461 22.3017 35.4359 20.7293C36.1082 20.1388 36.6831 19.6313 36.7137 19.6017C37.5681 18.7742 38.0857 18.6551 38.6132 19.1642L38.9383 19.478V34.5138L39.1856 34.6809C39.6343 34.9843 41.2534 34.9022 43.195 34.4775C44.1268 34.2737 45.2896 34.0291 45.779 33.9339C46.2927 33.8341 46.7276 33.687 46.8079 33.5861C47.0172 33.3228 47.0109 5.87708 46.8014 5.6005C46.6822 5.4431 46.2851 5.37063 44.605 5.1996C43.477 5.08482 42.2972 5.00505 41.983 5.02223L41.4121 5.05368L35.4898 10.261C27.3144 17.4495 27.7989 17.0418 27.5372 16.9533C27.4148 16.912 26.1045 16.8746 24.6253 16.8702C22.0674 16.8626 21.9233 16.8513 21.6777 16.6396C21.0693 16.115 17.2912 12.8028 14.5726 10.4108C12.9548 8.98729 10.9055 7.18761 10.0186 6.41134L8.40584 5L7.5715 5.01331C7.11256 5.02072 5.95198 5.11252 4.99239 5.21742Z"/>
    <path d="M25.572 37.9556C25.3176 38.3822 24.6815 38.3822 24.427 37.9556L23.4728 36.3558C23.2184 35.9292 23.5364 35.396 24.0453 35.396H25.9537C26.4626 35.396 26.7807 35.9292 26.5262 36.3558L25.572 37.9556Z"/>
    <path d="M3 37.3157C3 36.9034 3.3453 36.5691 3.77126 36.5691H14.3485C14.7745 36.5691 15.1198 36.9034 15.1198 37.3157C15.1198 37.728 14.7745 38.0623 14.3485 38.0623H3.77126C3.3453 38.0623 3 37.728 3 37.3157Z"/>
    <path d="M3.58851 44.5029C3.44604 44.1144 3.65596 43.6876 4.05738 43.5497L14.0254 40.1251C14.4269 39.9872 14.8678 40.1904 15.0102 40.5789C15.1527 40.9675 14.9428 41.3943 14.5414 41.5322L4.57331 44.9568C4.17189 45.0947 3.73098 44.8915 3.58851 44.5029Z"/>
    <path d="M47 37.3157C47 36.9034 46.6547 36.5691 46.2287 36.5691H35.6515C35.2255 36.5691 34.8802 36.9034 34.8802 37.3157C34.8802 37.728 35.2255 38.0623 35.6515 38.0623H46.2287C46.6547 38.0623 47 37.728 47 37.3157Z"/>
    <path d="M46.4115 44.5029C46.554 44.1144 46.344 43.6876 45.9426 43.5497L35.9746 40.1251C35.5731 39.9872 35.1322 40.1904 34.9898 40.5789C34.8473 40.9675 35.0572 41.3943 35.4586 41.5322L45.4267 44.9568C45.8281 45.0947 46.269 44.8915 46.4115 44.5029Z"/>
  </svg>
)

const ClashVergeIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 50 50" fill="none">
    <path d="M30.9988 13.4144C27.2973 12.0435 23.5958 11.9064 19.0716 13.4144C14.1362 10.6726 10.846 4.36632 7.967 5.05171C5.08802 5.7371 5.91058 16.8418 5.91058 24.2448C4.26545 26.4384 3.64225 29.205 4.12911 31.7851C7.69353 48.9219 40.8711 49.8816 45.8057 31.7851C46.6656 28.6319 44.8461 25.0674 44.1599 24.2448C44.1599 16.7047 44.9825 5.20727 42.2406 5.05168C38.539 4.84163 35.523 10.8096 30.9988 13.4144Z" stroke="currentColor" strokeWidth="2.5"/>
    <path d="M27.9837 34.1749C27.9836 33.078 21.5403 33.0711 21.5403 34.1749C21.5403 35.8199 24.6933 37.328 24.6933 37.328C24.6933 37.328 27.9838 35.8822 27.9837 34.1749Z" fill="currentColor"/>
    <path d="M17.8383 25.5362C16.6044 24.5766 13.3656 23.754 12.0803 25.8105C10.9382 27.6378 12.4017 29.8157 14.2738 30.8829C16.1459 31.95 20.0317 31.2941 20.0317 29.649C20.0317 28.004 19.0721 26.4957 17.8383 25.5362Z" fill="currentColor"/>
    <path d="M31.8219 25.4405C33.0557 24.4809 36.2945 23.6583 37.5799 25.7148C38.722 27.5421 37.2584 29.72 35.3863 30.7872C33.5142 31.8543 29.6285 31.1984 29.6285 29.5533C29.6285 27.9083 30.588 26.4 31.8219 25.4405Z" fill="currentColor"/>
  </svg>
)

const ShadowrocketIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.2394 36.832L16.5386 39.568C16.5386 39.568 13.7182 36.832 11.8379 33.184C9.95756 29.536 16.5386 23.152 16.5386 23.152M21.2394 36.832H28.7606M21.2394 36.832C21.2394 36.832 15.5985 24.064 17.4788 16.768C19.3591 9.472 25 4 25 4C25 4 30.6409 9.472 32.5212 16.768C34.4015 24.064 28.7606 36.832 28.7606 36.832M28.7606 36.832L33.4614 39.568C33.4614 39.568 36.2818 36.832 38.1621 33.184C40.0424 29.536 33.4614 23.152 33.4614 23.152M25 46L26.8803 40.528H23.1197L25 46ZM25.9402 17.68C26.4594 18.1837 26.4594 19.0003 25.9402 19.504C25.4209 20.0077 24.5791 20.0077 24.0598 19.504C23.5406 19.0003 23.5406 18.1837 24.0598 17.68C24.5791 17.1763 25.4209 17.1763 25.9402 17.68Z"/>
  </svg>
)

const StreisandIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 50 50" fill="currentColor">
    <path d="M25 46L24.2602 47.0076C24.7027 47.3325 25.3054 47.3306 25.7459 47.0031L25 46ZM6.14773 32.1591H4.89773C4.89773 32.557 5.0872 32.9312 5.40797 33.1667L6.14773 32.1591ZM43.6136 32.1591L44.3595 33.1622C44.6767 32.9263 44.8636 32.5543 44.8636 32.1591H43.6136ZM6.14773 19.9886L5.42485 18.9689C5.09421 19.2032 4.89773 19.5834 4.89773 19.9886H6.14773ZM25 6.625L25.729 5.6096L25.0046 5.08952L24.2771 5.60522L25 6.625ZM43.6136 19.9886H44.8636C44.8636 19.586 44.6697 19.208 44.3426 18.9732L43.6136 19.9886ZM3.25 38.5568C2.69772 38.971 2.58579 39.7545 3 40.3068C3.41421 40.8591 4.19772 40.971 4.75 40.5568L4 39.5568L3.25 38.5568ZM13.3409 34.1136C13.8932 33.6994 14.0051 32.9159 13.5909 32.3636C13.1767 31.8114 12.3932 31.6994 11.8409 32.1136L12.5909 33.1136L13.3409 34.1136ZM8.97727 42.8523C8.42499 43.2665 8.31306 44.05 8.72727 44.6023C9.14149 45.1546 9.92499 45.2665 10.4773 44.8523L9.72727 43.8523L8.97727 42.8523ZM19.0682 38.4091C19.6205 37.9949 19.7324 37.2114 19.3182 36.6591C18.904 36.1068 18.1205 35.9949 17.5682 36.4091L18.3182 37.4091L19.0682 38.4091ZM45.25 40.5568C45.8023 40.971 46.5858 40.8591 47 40.3068C47.4142 39.7545 47.3023 38.971 46.75 38.5568L46 39.5568L45.25 40.5568ZM38.1591 32.1136C37.6068 31.6994 36.8233 31.8114 36.4091 32.3636C35.9949 32.9159 36.1068 33.6994 36.6591 34.1136L37.4091 33.1136L38.1591 32.1136ZM39.5227 44.8523C40.075 45.2665 40.8585 45.1546 41.2727 44.6023C41.6869 44.05 41.575 43.2665 41.0227 42.8523L40.2727 43.8523L39.5227 44.8523ZM32.4318 36.4091C31.8795 35.9949 31.096 36.1068 30.6818 36.6591C30.2676 37.2114 30.3795 37.9949 30.9318 38.4091L31.6818 37.4091L32.4318 36.4091ZM46.2727 9.29545C46.825 8.88124 46.9369 8.09774 46.5227 7.54545C46.1085 6.99317 45.325 6.88124 44.7727 7.29545L45.5227 8.29545L46.2727 9.29545ZM36.1818 13.7386C35.6295 14.1528 35.5176 14.9364 35.9318 15.4886C36.346 16.0409 37.1295 16.1528 37.6818 15.7386L36.9318 14.7386L36.1818 13.7386ZM40.5455 5C41.0977 4.58579 41.2097 3.80228 40.7955 3.25C40.3812 2.69772 39.5977 2.58579 39.0455 3L39.7955 4L40.5455 5ZM30.4545 9.44318C29.9023 9.8574 29.7903 10.6409 30.2045 11.1932C30.6188 11.7455 31.4023 11.8574 31.9545 11.4432L31.2045 10.4432L30.4545 9.44318ZM5.70455 7.29545C5.15226 6.88124 4.36876 6.99317 3.95455 7.54545C3.54033 8.09774 3.65226 8.88124 4.20455 9.29545L4.95455 8.29545L5.70455 7.29545ZM12.7955 15.7386C13.3477 16.1528 14.1312 16.0409 14.5455 15.4886C14.9597 14.9364 14.8477 14.1528 14.2955 13.7386L13.5455 14.7386L12.7955 15.7386ZM11.4318 3C10.8795 2.58579 10.096 2.69772 9.68182 3.25C9.2676 3.80228 9.37953 4.58579 9.93182 5L10.6818 4L11.4318 3ZM18.5227 11.4432C19.075 11.8574 19.8585 11.7455 20.2727 11.1932C20.6869 10.6409 20.575 9.8574 20.0227 9.44318L19.2727 10.4432L18.5227 11.4432ZM25 46L25.7398 44.9924L6.88748 31.1515L6.14773 32.1591L5.40797 33.1667L24.2602 47.0076L25 46ZM43.6136 32.1591L42.8678 31.156L24.2541 44.9969L25 46L25.7459 47.0031L44.3595 33.1622L43.6136 32.1591ZM25 33.8295L25.7398 32.8219L6.88748 18.981L6.14773 19.9886L5.40797 20.9962L24.2602 34.8371L25 33.8295ZM6.14773 19.9886L6.87061 21.0084L25.7229 7.64478L25 6.625L24.2771 5.60522L5.42485 18.9689L6.14773 19.9886ZM25 6.625L24.271 7.6404L42.8846 21.004L43.6136 19.9886L44.3426 18.9732L25.729 5.6096L25 6.625ZM43.6136 19.9886L42.8678 18.9856L24.2541 32.8265L25 33.8295L25.7459 34.8326L44.3595 20.9917L43.6136 19.9886ZM43.6136 32.1591H44.8636V19.9886H43.6136H42.3636V32.1591H43.6136ZM25 33.8295H23.75V46H25H26.25V33.8295H25ZM6.14773 32.1591H7.39773V19.9886H6.14773H4.89773V32.1591H6.14773ZM4 39.5568L4.75 40.5568L13.3409 34.1136L12.5909 33.1136L11.8409 32.1136L3.25 38.5568L4 39.5568ZM9.72727 43.8523L10.4773 44.8523L19.0682 38.4091L18.3182 37.4091L17.5682 36.4091L8.97727 42.8523L9.72727 43.8523ZM46 39.5568L46.75 38.5568L38.1591 32.1136L37.4091 33.1136L36.6591 34.1136L45.25 40.5568L46 39.5568ZM40.2727 43.8523L41.0227 42.8523L32.4318 36.4091L31.6818 37.4091L30.9318 38.4091L39.5227 44.8523L40.2727 43.8523ZM45.5227 8.29545L44.7727 7.29545L36.1818 13.7386L36.9318 14.7386L37.6818 15.7386L46.2727 9.29545L45.5227 8.29545ZM39.7955 4L39.0455 3L30.4545 9.44318L31.2045 10.4432L31.9545 11.4432L40.5455 5L39.7955 4ZM4.95455 8.29545L4.20455 9.29545L12.7955 15.7386L13.5455 14.7386L14.2955 13.7386L5.70455 7.29545L4.95455 8.29545ZM10.6818 4L9.93182 5L18.5227 11.4432L19.2727 10.4432L20.0227 9.44318L11.4318 3L10.6818 4Z"/>
  </svg>
)

// App icon mapping by name (case-insensitive)
const getAppIcon = (appName: string, isFeatured: boolean): React.ReactNode => {
  const name = appName.toLowerCase()
  if (name.includes('happ')) {
    return <HappIcon />
  }
  if (name.includes('shadowrocket') || name.includes('rocket')) {
    return <ShadowrocketIcon />
  }
  if (name.includes('streisand')) {
    return <StreisandIcon />
  }
  if (name.includes('verge')) {
    return <ClashVergeIcon />
  }
  if (name.includes('clash') || name.includes('meta')) {
    return <ClashMetaIcon />
  }
  // Default icons
  return isFeatured ? '⭐' : '📦'
}

// Platform order for display
const platformOrder = ['ios', 'android', 'windows', 'macos', 'linux', 'androidTV', 'appleTV']

// Dangerous schemes that should never be allowed
const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:']

function isValidExternalUrl(url: string | undefined): boolean {
  if (!url) return false
  const lowerUrl = url.toLowerCase().trim()
  if (dangerousSchemes.some(scheme => lowerUrl.startsWith(scheme))) {
    return false
  }
  return lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://')
}

function isValidDeepLink(url: string | undefined): boolean {
  if (!url) return false
  const lowerUrl = url.toLowerCase().trim()
  if (dangerousSchemes.some(scheme => lowerUrl.startsWith(scheme))) {
    return false
  }
  return lowerUrl.includes('://')
}

function detectPlatform(): string | null {
  if (typeof window === 'undefined' || !navigator?.userAgent) {
    return null
  }
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) {
    if (/tv|television|smart-tv|smarttv/.test(ua)) return 'androidTV'
    return 'android'
  }
  if (/macintosh|mac os x/.test(ua)) return 'macos'
  if (/windows/.test(ua)) return 'windows'
  if (/linux/.test(ua)) return 'linux'
  return null
}

export default function ConnectionModal({ onClose }: ConnectionModalProps) {
  const { t, i18n } = useTranslation()
  const [selectedApp, setSelectedApp] = useState<AppInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null)
  const [showAppSelector, setShowAppSelector] = useState(false)
  const modalContentRef = useRef<HTMLDivElement>(null)

  const { data: appConfig, isLoading, error } = useQuery<AppConfig>({
    queryKey: ['appConfig'],
    queryFn: () => subscriptionApi.getAppConfig(),
  })

  useEffect(() => {
    setDetectedPlatform(detectPlatform())
  }, [])

  // Auto-select platform and app when data is loaded
  useEffect(() => {
    if (!appConfig?.platforms || selectedApp) return

    const platform = detectedPlatform || platformOrder.find(p => appConfig.platforms[p]?.length > 0)
    if (!platform || !appConfig.platforms[platform]?.length) return

    const apps = appConfig.platforms[platform]
    // Prefer featured app, otherwise first app
    const app = apps.find(a => a.isFeatured) || apps[0]

    if (app) {
      setSelectedApp(app)
    }
  }, [appConfig, detectedPlatform, selectedApp])

  // Scroll modal content to top when switching views
  useEffect(() => {
    modalContentRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [showAppSelector])

  // Scroll lock when modal is open (cross-platform)
  useEffect(() => {
    const scrollY = window.scrollY
    const body = document.body
    const html = document.documentElement

    // Save original styles
    const originalStyles = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: html.style.overflow,
    }

    // Lock scroll
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    html.style.overflow = 'hidden'

    return () => {
      body.style.overflow = originalStyles.bodyOverflow
      body.style.position = originalStyles.bodyPosition
      body.style.top = originalStyles.bodyTop
      body.style.width = originalStyles.bodyWidth
      html.style.overflow = originalStyles.htmlOverflow
      window.scrollTo(0, scrollY)
    }
  }, [])

  const getLocalizedText = (text: LocalizedText | undefined): string => {
    if (!text) return ''
    const lang = i18n.language || 'en'
    return text[lang] || text['en'] || text['ru'] || Object.values(text)[0] || ''
  }

  const getPlatformName = (platformKey: string): string => {
    if (!appConfig?.platformNames?.[platformKey]) {
      return platformKey
    }
    return getLocalizedText(appConfig.platformNames[platformKey])
  }

  const availablePlatforms = useMemo(() => {
    if (!appConfig?.platforms) return []
    const available = platformOrder.filter(
      (key) => appConfig.platforms[key] && appConfig.platforms[key].length > 0
    )
    if (detectedPlatform && available.includes(detectedPlatform)) {
      const filtered = available.filter(p => p !== detectedPlatform)
      return [detectedPlatform, ...filtered]
    }
    return available
  }, [appConfig, detectedPlatform])

  // Get all apps for selector (must be before any conditional returns)
  const allAppsForSelector = useMemo(() => {
    if (!appConfig?.platforms) return []
    const result: { platform: string; apps: AppInfo[] }[] = []
    for (const platform of availablePlatforms) {
      const apps = appConfig.platforms[platform]
      if (apps?.length) {
        result.push({ platform, apps })
      }
    }
    return result
  }, [appConfig, availablePlatforms])

  const copySubscriptionLink = async () => {
    if (!appConfig?.subscriptionUrl) return
    try {
      await navigator.clipboard.writeText(appConfig.subscriptionUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = appConfig.subscriptionUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleConnect = (app: AppInfo) => {
    if (!app.deepLink || !isValidDeepLink(app.deepLink)) {
      console.warn('Invalid or missing deep link:', app.deepLink)
      return
    }
    const lang = i18n.language?.startsWith('ru') ? 'ru' : 'en'
    const redirectUrl = `${window.location.origin}/miniapp/redirect.html?url=${encodeURIComponent(app.deepLink)}&lang=${lang}`
    const isCustomScheme = !/^https?:\/\//i.test(app.deepLink)
    const tg = (window as unknown as { Telegram?: { WebApp?: { openLink?: (url: string, options?: object) => void } } }).Telegram?.WebApp
    if (isCustomScheme && tg?.openLink) {
      try {
        tg.openLink(redirectUrl, { try_instant_view: false, try_browser: true })
        return
      } catch (e) {
        console.warn('tg.openLink failed:', e)
      }
    }
    window.location.href = redirectUrl
  }

  // Modal wrapper - top aligned with auto-focus
  const ModalWrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      className="fixed inset-0 bg-black/70 z-[60] flex items-start justify-center"
      style={{ paddingTop: `calc(2rem + env(safe-area-inset-top, 0px))` }}
      onClick={onClose}
    >
      <div
        ref={modalContentRef}
        tabIndex={-1}
        className="w-[calc(100%-2rem)] max-w-sm bg-dark-900 rounded-2xl border border-dark-700/50 overflow-y-auto overscroll-contain animate-scale-in shadow-2xl flex flex-col outline-none"
        style={{
          maxHeight: 'calc(100dvh - 6rem)',
          WebkitOverflowScrolling: 'touch',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )

  // Loading state
  if (isLoading) {
    return (
      <ModalWrapper>
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-3 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </ModalWrapper>
    )
  }

  // Error state
  if (error || !appConfig) {
    return (
      <ModalWrapper>
        <div className="text-center p-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-error-500/10 flex items-center justify-center">
            <span className="text-2xl">😕</span>
          </div>
          <p className="text-dark-300 mb-4 text-sm">{t('common.error')}</p>
          <button onClick={onClose} className="btn-primary text-sm px-6">
            {t('common.close')}
          </button>
        </div>
      </ModalWrapper>
    )
  }

  // No subscription
  if (!appConfig.hasSubscription) {
    return (
      <ModalWrapper>
        <div className="text-center p-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-warning-500/10 flex items-center justify-center">
            <span className="text-2xl">📱</span>
          </div>
          <h3 className="font-semibold text-dark-100 mb-1">{t('subscription.connection.title')}</h3>
          <p className="text-dark-400 text-sm mb-4">{t('subscription.connection.noSubscription')}</p>
          <button onClick={onClose} className="btn-primary text-sm px-6">
            {t('common.close')}
          </button>
        </div>
      </ModalWrapper>
    )
  }

  // App selector view
  if (showAppSelector || !selectedApp) {
    return (
      <ModalWrapper>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-800">
          <div className="flex items-center gap-2">
            {selectedApp && (
              <button onClick={() => setShowAppSelector(false)} className="p-2 -ml-2 rounded-xl hover:bg-dark-800 text-dark-400">
                <BackIcon />
              </button>
            )}
            <div>
              <h2 className="font-semibold text-dark-100 text-sm">{t('subscription.connection.selectApp')}</h2>
              <p className="text-xs text-dark-500">{t('subscription.connection.selectDevice')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-dark-800 text-dark-400">
            <CloseIcon />
          </button>
        </div>

        {/* Apps by platform */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {allAppsForSelector.map(({ platform, apps }) => {
            const IconComponent = platformIconComponents[platform]
            const isCurrentPlatform = platform === detectedPlatform
            return (
              <div key={platform}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`${isCurrentPlatform ? 'text-accent-400' : 'text-dark-500'}`}>
                    {IconComponent && <IconComponent />}
                  </div>
                  <span className={`text-xs font-medium ${isCurrentPlatform ? 'text-accent-400' : 'text-dark-400'}`}>
                    {getPlatformName(platform)}
                    {isCurrentPlatform && <span className="ml-1 text-[10px]">({t('subscription.connection.yourDevice')})</span>}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {apps.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => {
                        setSelectedApp(app)
                        setShowAppSelector(false)
                      }}
                      className={`w-full p-2.5 rounded-xl border transition-all flex items-center gap-3 ${
                        selectedApp?.id === app.id
                          ? 'bg-accent-500/10 border-accent-500/50'
                          : 'bg-dark-800/50 border-dark-700/50 hover:border-dark-600'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center text-sm">
                        {getAppIcon(app.name, app.isFeatured)}
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-medium text-dark-100 text-sm truncate">{app.name}</span>
                        {app.isFeatured && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent-500/20 text-accent-400 shrink-0">
                            {t('subscription.connection.featured')}
                          </span>
                        )}
                      </div>
                      <ChevronIcon />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Copy link */}
        <div className="p-4 border-t border-dark-800">
          <button
            onClick={copySubscriptionLink}
            className={`w-full p-2.5 rounded-xl border-2 border-dashed transition-all flex items-center justify-center gap-2 text-sm ${
              copied
                ? 'border-success-500/50 bg-success-500/10 text-success-400'
                : 'border-dark-700 hover:border-accent-500/50 text-dark-400'
            }`}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? t('subscription.connection.copied') : t('subscription.connection.copyLink')}
          </button>
        </div>
      </ModalWrapper>
    )
  }

  // App instructions (main view)
  return (
    <ModalWrapper>
      {/* Header with app info and change button */}
      <div className="flex items-center justify-between p-4 border-b border-dark-800">
        <button
          onClick={() => setShowAppSelector(true)}
          className="flex items-center gap-3 p-2 -m-2 rounded-xl hover:bg-dark-800/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center">
            {getAppIcon(selectedApp.name, selectedApp.isFeatured)}
          </div>
          <div className="text-left">
            <h2 className="font-semibold text-dark-100 text-sm">{selectedApp.name}</h2>
            <p className="text-xs text-accent-400">{t('subscription.connection.changeApp') || 'Сменить'} →</p>
          </div>
        </button>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-dark-800 text-dark-400">
          <CloseIcon />
        </button>
      </div>

      {/* Instructions */}
      <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
        {/* Step 1: Install */}
        {selectedApp.installationStep && (
          <div className="p-3 rounded-xl bg-dark-800/50 border border-dark-700/50">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-accent-500/20 flex items-center justify-center text-xs font-bold text-accent-400 shrink-0 mt-0.5">1</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-dark-100 text-sm mb-1">{t('subscription.connection.installApp')}</h3>
                <p className="text-xs text-dark-400 mb-2">
                  {getLocalizedText(selectedApp.installationStep.description)}
                </p>
                {selectedApp.installationStep.buttons && selectedApp.installationStep.buttons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedApp.installationStep.buttons
                      .filter((btn) => isValidExternalUrl(btn.buttonLink))
                      .map((btn, idx) => (
                      <a
                        key={idx}
                        href={btn.buttonLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-700 text-dark-200 text-xs hover:bg-dark-600 transition-all"
                      >
                        <LinkIcon />
                        {getLocalizedText(btn.buttonText)}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Add subscription */}
        {selectedApp.addSubscriptionStep && (
          <div className="p-3 rounded-xl bg-dark-800/50 border border-dark-700/50">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-accent-500/20 flex items-center justify-center text-xs font-bold text-accent-400 shrink-0 mt-0.5">2</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-dark-100 text-sm mb-1">{t('subscription.connection.addSubscription')}</h3>
                <p className="text-xs text-dark-400 mb-2">
                  {getLocalizedText(selectedApp.addSubscriptionStep.description)}
                </p>
                <div className="space-y-1.5">
                  {selectedApp.deepLink && (
                    <button
                      onClick={() => handleConnect(selectedApp)}
                      className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-2"
                    >
                      <LinkIcon />
                      {t('subscription.connection.addToApp', { appName: selectedApp.name })}
                    </button>
                  )}
                  <button
                    onClick={copySubscriptionLink}
                    className={`w-full p-2 rounded-lg border transition-all flex items-center justify-center gap-2 text-xs ${
                      copied
                        ? 'border-success-500/50 bg-success-500/10 text-success-400'
                        : 'border-dark-700 hover:border-dark-600 bg-dark-800/50 text-dark-300'
                    }`}
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    {copied ? t('subscription.connection.copied') : t('subscription.connection.copyLink')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Connect */}
        {selectedApp.connectAndUseStep && (
          <div className="p-3 rounded-xl bg-dark-800/50 border border-dark-700/50">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-success-500/20 flex items-center justify-center text-xs font-bold text-success-400 shrink-0 mt-0.5">3</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-dark-100 text-sm mb-1">{t('subscription.connection.connectVpn')}</h3>
                <p className="text-xs text-dark-400">
                  {getLocalizedText(selectedApp.connectAndUseStep.description)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-dark-800">
        <button onClick={onClose} className="btn-secondary w-full text-sm">
          {t('common.close')}
        </button>
      </div>
    </ModalWrapper>
  )
}
