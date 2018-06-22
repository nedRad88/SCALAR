var Page = {}

window.onload = function(){
  // CARDS

    Page.showmore = function(){
      $('.description').switchClass("hideContent", "showContent", 400);
      $('.show-more').hide();
    }
}
