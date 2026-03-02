import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckSquare, Square, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAYPAL_URL = "https://www.paypal.com/webapps/hermes?token=10M62691DD355105D&useraction=commit&rm=1&wpsFlowRedirectToXorouterSkipHermesStartTime=1772486683042&flowType=WPS&mfid=1772486682826_f69011947455e";

export default function JoinTheLeague() {
  const [agreed, setAgreed] = useState(false);

  const handleProceed = () => {
    if (agreed) {
      window.open(PAYPAL_URL, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Join the League</h1>
          <p className="text-gray-400">Please read and agree to the terms and conditions before proceeding.</p>
        </div>

        <div className="bg-[#1A1B20] border border-gray-700 rounded-xl p-6 mb-6 max-h-[60vh] overflow-y-auto space-y-5 text-sm text-gray-300 leading-relaxed">

          <div>
            <h2 className="text-red-400 font-bold text-base mb-2">RRR Mission Statement</h2>
            <p>To create an inclusive, fun, competitive environment for players at all skill levels who are interested in improving their game or socializing without the risk of losing money.</p>
          </div>

          <p>The River Rat Rounders (RRR) plays No-Limit Texas Hold 'em poker tournaments. To learn how the game of Texas Hold 'em is played, click <a href="https://en.wikipedia.org/wiki/Texas_hold_%27em" target="_blank" rel="noopener noreferrer" className="text-red-400 underline">HERE</a>.</p>

          <div>
            <h2 className="text-white font-bold mb-1">RULINGS</h2>
            <p>With our casino sponsorship, we want our players to feel comfortable and confident when they go play in the casino. With a few exceptions, we follow the TOURNAMENT DIRECTORS ASSOCIATION on tournament rulings. There are 62 total rules in the TDA language. The 1st Three Rules posted here clear up MOST of the discrepancies at our games:</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-1">Floor Decisions</h3>
            <p>Floorpeople must consider the best interest of the game and fairness as top priorities in the decision-making process. Unusual circumstances can on occasion dictate that decisions in the interest of fairness take priority over the technical rules. The floorperson's decision is final.</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-1">Player Responsibilities</h3>
            <p>Players are expected to verify registration data and seat assignments, protect their hands, make their intentions clear, follow the action, act in turn, defend their right to act, keep cards visible, keep chips correctly stacked, remain at the table with a live hand, speak up if they see a mistake being made, transfer tables promptly, follow one player to a hand, know and comply with the rules, follow proper etiquette, and generally contribute to an orderly tournament.</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-1">Official Terminology of Tournament Poker</h3>
            <p>Official betting terms are simple, unmistakable, time-honored declarations like: bet, raise, call, fold, check, all-in, pot (in pot-limit only), and complete. Regional terms may also meet this standard. The use of non-standard language is at player's risk because it may result in a ruling other than what the player intended. It is the responsibility of players to make their intentions clear. See also Rules 40 & 49.</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-1">STARTING STACKS</h3>
            <p>All players start with an 8,000 starting stack and will receive league loyalty chips based on card guards earned, advertising, dealing and more. Extra chips are also awarded for most items that are ordered through the establishment. See your Tournament Director (TD) at the event for a more detailed explanation.</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-1">BLINDS</h3>
            <p>Progress every 15 minutes until the tournament gets down to one winner. Based on the number of players in the tournament and the amount of chips in play, the TD has the right to lengthen or shorten the blind period to ensure a timely tournament.</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-1">CHOP OPTIONS</h3>
            <p>Players DO have the option to negotiate on splitting the prizes for that night; however, whoever takes the card guard, takes credit for the win. Points cannot be chopped. A 1st, 2nd, 3rd, etc. has to be clearly determined.</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-1">COLORING UP</h3>
            <p>At the green/white color up… anything 50 and up will be colored up while 50 and lower will be colored down. When black chips come out of play, 700 colors up, 600 colors down.</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-1">RE-ENTRIES/ADD-ONS</h3>
            <p>We allow unlimited re-entries and add-ons for the first 5 levels of the tournament. At the end of the 2000/4000 blind level, all chips incentives are cut off and it becomes a freeze-out tournament. The TD has the right to cut off that time frame earlier at his/her discretion.</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-1">DEALERS</h3>
            <p>We have table dealers! However, they are also our players, so they get 1,500 extra chips to be dealers in the game while also enjoying the opportunity to play. We have found that it's easier on our beginners, chillers, TD for communication purposes, and more to have this system in place. However, because our dealers have an interest in the game, ANY instance of question needs to have a floor call to protect the fairness of the game.</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-1">SHOW ONE, SHOW ALL RULE</h3>
            <p>One player per hand. While we do pride ourselves on being not only a learning league, we are also a very competitive one. If a player shows their hand to ANYONE in the hand, the cards are immediately tabled and mucked to show all players. If the player shows what they're folding to a person out of the hand, the hand will also be shown to the table.</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-1">KEEP YOUR HANDS OUT OF THE POT!</h3>
            <p>The dealer is the ONLY person who should be making change, creating side-pots, etc. Too many hands in the pot creates confusion and opens the door for cheating. While you may verbally help a dealer if needed, your hands still need to stay out of the pot.</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-1">DEAD STACKS/DEAD HANDS</h3>
            <p>Absent players will be dealt a hand and held responsible for blinds. If a player is absent when it is their turn to act, the hand will be folded. The hand is mucked if the player is not seated by the time the last card hits the dealer button position. Dead Stacks where players have not assumed the seat will be dealt in and blinded out until the end of level 2. Late entries are allowed until the end of level 4.</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-1">TDA EXCEPTIONS</h3>
            <p>Instead of doubling the previous BET, for simplicity reasons, we double the previous AMOUNT. For example: if the blinds are 100/200, 1st raise will be 400. TDA rules that the next raise could be 600, but in RRR, it goes to 800. It's always double the previous player's chip amount.</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-1">ENGLISH ONLY</h3>
            <p>We love our melting pot poker league. However, we follow the English-only rule to protect the integrity of the game.</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-1">BEHAVIOR</h3>
            <p>You are all adults and are expected to conduct yourself in a way that represents this poker league in a way that makes our establishments proud to keep having us back each week. At any time, the TD has the right to put a player on a 3-5 hand penalty or even remove the player's chips and disqualify them for the tournament. All nights are re-capped to the owner of the league and the league owner may enforce a longer punishment if needed. As a business we always strive to provide a fun, welcoming environment to ensure repeat business for the league and for the establishments. If someone is acting out of line with this mission, that player may be banned from the league for a pre-determined amount of time up to permanently. Any suspensions or banishments disqualify that player from participating in league associated events and winning awards during the suspension or banishment period. RRR has NO TOLERANCE for threats, acts of violence, and cheating. Any other associated behavior putting the league in a position that puts the integrity of the game at risk may also lead to suspensions and/or banishments from the league with or without warning.</p>
          </div>

          <div className="border-t border-red-600/40 pt-4">
            <p className="text-red-400 font-bold text-center text-base">NO FORM OF CURRENCY MAY BE ON THE TABLE FOR ANY REASON AT ANY TIME. THIS IS PROHIBITED BY LAW.</p>
          </div>
        </div>

        {/* Agreement Checkbox */}
        <div
          className="flex items-start gap-3 mb-6 cursor-pointer select-none"
          onClick={() => setAgreed(!agreed)}
        >
          <div className="mt-0.5 shrink-0">
            {agreed
              ? <CheckSquare className="w-6 h-6 text-red-400" />
              : <Square className="w-6 h-6 text-gray-500" />
            }
          </div>
          <p className="text-gray-300 text-sm">
            I have read and agree to all of the River Rat Rounders terms and conditions listed above.
          </p>
        </div>

        {/* Proceed Button */}
        <Button
          onClick={handleProceed}
          disabled={!agreed}
          className={`w-full py-6 text-base font-bold flex items-center justify-center gap-2 transition-all ${
            agreed
              ? "bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 text-white shadow-lg shadow-red-900/40"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
        >
          <ExternalLink className="w-5 h-5" />
          Proceed to Payment
        </Button>
      </div>
    </div>
  );
}