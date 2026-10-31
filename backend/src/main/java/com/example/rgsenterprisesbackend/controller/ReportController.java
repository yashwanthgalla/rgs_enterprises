package com.example.rgsenterprisesbackend.controller;

import com.example.rgsenterprisesbackend.dto.ApiResponse;
import com.example.rgsenterprisesbackend.dto.GodownPnlResponse;
import com.example.rgsenterprisesbackend.dto.ReportSummaryResponse;
import com.example.rgsenterprisesbackend.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Reports & Analytics", description = "Financial audits, P&L statements, and CSV exports")
public class ReportController {

    private final ReportService reportService;

    private LocalDate[] resolvePeriod(Integer year, LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null) {
            return new LocalDate[]{startDate, endDate};
        }
        if (year != null && year > 2000) {
            return new LocalDate[]{LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31)};
        }
        int curYear = LocalDate.now().getYear();
        return new LocalDate[]{LocalDate.of(curYear, 1, 1), LocalDate.of(curYear, 12, 31)};
    }

    @GetMapping("/summary")
    @Operation(summary = "Get high-level financial summary and category breakdown for a period")
    public ResponseEntity<ApiResponse<ReportSummaryResponse>> getSummary(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        LocalDate[] period = resolvePeriod(year, startDate, endDate);
        ReportSummaryResponse response = reportService.getSummary(period[0], period[1]);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/godown-pnl")
    @Operation(summary = "Get godown-wise P&L breakdown")
    public ResponseEntity<ApiResponse<List<GodownPnlResponse>>> getGodownPnl(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        LocalDate[] period = resolvePeriod(year, startDate, endDate);
        List<GodownPnlResponse> response = reportService.getGodownPnl(period[0], period[1]);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/export-csv")
    @Operation(summary = "Download P&L report as CSV file")
    public ResponseEntity<InputStreamResource> exportPnlCsv(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        LocalDate[] period = resolvePeriod(year, startDate, endDate);
        ByteArrayInputStream csvStream = reportService.generatePnlCsv(period[0], period[1]);
        String filename = "godown_pnl_report_" + (year != null ? year : LocalDate.now().getYear()) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(new InputStreamResource(csvStream));
    }
}
