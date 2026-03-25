package com.example.slotmachinegame;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Random;

@WebServlet("/spin")
public class SpinServlet extends HttpServlet {
    private static final String[] SYMBOLS = {"🍋", "🍒", "🍇", "7️⃣", "💎"};
    private final Random random = new Random();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        String reel1 = SYMBOLS[random.nextInt(SYMBOLS.length)];
        String reel2 = SYMBOLS[random.nextInt(SYMBOLS.length)];
        String reel3 = SYMBOLS[random.nextInt(SYMBOLS.length)];

        boolean won = reel1.equals(reel2) && reel2.equals(reel3);
        String message = won ? "🎉 Jackpot! You won! 🎉" : "Spin again!";

        response.setContentType("application/json; charset=UTF-8");

        try (PrintWriter out = response.getWriter()) {
            String jsonResponse = String.format(
                    "{\"reels\": [\"%s\", \"%s\", \"%s\"], \"message\": \"%s\", \"won\": %b}",
                    escapeJson(reel1), escapeJson(reel2), escapeJson(reel3),
                    escapeJson(message), won
            );
            out.print(jsonResponse);
        }
    }

    private String escapeJson(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
