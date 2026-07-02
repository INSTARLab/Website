(function ($) {
 "use strict";

/* Nivo slider  */
	$("#gallery-filter").mixitup({
			effects: ['fade','rotateZ'],
			easing: 'snap'
		}); 

/* Nivo slider*/
	var $nivoBanner = $('#ma-inivoslider-banner7');
	function syncNivoMainImageAlt() {
		var vars = $nivoBanner.data('nivo:vars');
		var current = vars && vars.currentImage;
		var alt = current ? $(current).attr('alt') : null;
		if (alt) { $nivoBanner.find('.nivo-main-image').attr('alt', alt); }
	}
	function labelNivoControlDots() {
		$nivoBanner.find('.nivo-controlNav a').each(function (i) {
			$(this).attr('aria-label', 'Go to slide ' + (i + 1));
		});
	}
	$nivoBanner.nivoSlider({
		effect: 'random',
		slices: 15,
		boxCols: 8,
		boxRows: 4,
		animSpeed: '600',
		pauseTime: '6000000',
		startSlide: 0,
		directionNav: 1,
		controlNav: 1,
		controlNavThumbs: false,
		pauseOnHover: false,
		manualAdvance: false,
		prevText: '<span class="left"><span class="visually-hidden">Previous slide</span><i class="fa fa-angle-left" aria-hidden="true"></i></span>',
		nextText: '<span class="right"><span class="visually-hidden">Next slide</span><i class="fa fa-angle-right" aria-hidden="true"></i></span>',
		afterLoad: function () { syncNivoMainImageAlt(); labelNivoControlDots(); },
		afterChange: syncNivoMainImageAlt
	});

/* magnificPopup */
	$('.popup-youtube').magnificPopup({
		disableOn: 700,
		type: 'iframe',
		mainClass: 'mfp-fade',
		removalDelay: 160,
		preloader: false,
		fixedContentPos: false
	});

	$('.image-link').magnificPopup({type:'inline', midClick:true, mainClass:'mfp-fade', removalDelay:160});

/* TOP Menu Stick + scrollUp now handled by js/site-chrome.js (no jQuery) */

/*slide product carosel*/
	$(".people-say-slide").owlCarousel({
		autoPlay : false,
		items : 1,
		itemsDesktop : [1199,1],
		itemsDesktopSmall : [980,1],
		itemsTablet: [768,1],
		itemsMobile : [479,1],
		slideSpeed : 3000,
		paginationSpeed : 3000,
		rewindSpeed : 3000,
		navigation : true,
		stopOnHover : true,
		pagination : false,
		scrollPerPage:true,
		navigationText : ['<span class="icon-left-open"><i class="fa fa-chevron-left" aria-hidden="true"></i></span>','<span class="icon-right-open"><i class="fa fa-chevron-right" aria-hidden="true"></i></span>'] 
	}); 

/* Newsletter signup now handled by js/newsletter.js (no jQuery) */

/* Circular Bars - Knob */
	if(typeof($.fn.knob) != 'undefined') {
	$('.knob').each(function () {
	  var $this = $(this),
		  knobVal = $this.attr('data-rel');

	  $this.knob({
		'draw' : function () { 
		  $(this.i).val(this.cv + '%')
		}
	  });
	  
	  $this.appear(function() {
		$({
		  value: 0
		}).animate({
		  value: knobVal
		}, {
		  duration : 2000,
		  easing   : 'swing',
		  step     : function () {
			$this.val(Math.ceil(this.value)).trigger('change');
		  }
		});
	  }, {accX: 0, accY: -150});
	});
	}	
		
})(jQuery);
   