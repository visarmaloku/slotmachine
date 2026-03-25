package com.example.slotmachinegame;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Comparator;
import java.util.stream.Collectors;

@WebServlet("/leaderboard")
public class LeaderboardServlet extends HttpServlet {

    private static final Map<String, Integer> leaderboard = new ConcurrentHashMap<>();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        String username = req.getParameter("username");
        String scoreStr = req.getParameter("score");

        if (username == null || scoreStr == null) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Missing parameters");
            return;
        }

        int score;
        try {
            score = Integer.parseInt(scoreStr);
        } catch (NumberFormatException e) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid score");
            return;
        }

        // store the best score per username
        leaderboard.merge(username, score, Math::max);
        resp.setStatus(HttpServletResponse.SC_OK);
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        resp.setContentType("application/json; charset=UTF-8");

        String json = leaderboard.entrySet().stream()
                .sorted(Map.Entry.comparingByValue(Comparator.reverseOrder()))
                .limit(10)
                .map(e -> String.format("{\"username\":\"%s\",\"score\":%d}",
                        escape(e.getKey()), e.getValue()))
                .collect(Collectors.joining(",", "[", "]"));

        try (PrintWriter out = resp.getWriter()) {
            out.print(json);
        }
    }

    private String escape(String text) {
        if (text == null) return "";
        return text.replace("\"", "\\\"");
    }
}
